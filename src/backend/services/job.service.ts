import prisma from '../config/prisma';
import { sendNotification } from '../config/socket';
import { JobStatus } from '@prisma/client';

const PAGE_SIZE = 10;

/**
 * List jobs.
 * - FARMER sees their own jobs.
 * - WORKER sees all PENDING jobs (available to accept).
 * - ADMIN sees all jobs.
 */
export const listJobs = async (userId: string, role: string, status?: string, page = 1, limit = PAGE_SIZE) => {
  const skip = (page - 1) * limit;

  const where: any = {};

  if (role === 'FARMER') {
    where.farmerId = userId;
  } else if (role === 'WORKER') {
    where.status = status ? (status as JobStatus) : 'PENDING';
    where.rejections = { none: { workerId: userId } };
  } else if (status) {
    where.status = status as JobStatus;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignments: {
          where: { status: 'ASSIGNED' },
          include: { worker: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Create a job (Farmer only).
 */
export const createJob = async (farmerId: string, data: {
  workName: string;
  workAddress: string;
  dateTime: string;
  workersNeeded: number;
  payPerWorker?: number;
  description?: string;
  lat?: number;
  lng?: number;
  polygonGeoJson?: any;
}) => {
  const job = await prisma.job.create({
    data: {
      farmerId,
      workName: data.workName,
      workAddress: data.workAddress,
      dateTime: new Date(data.dateTime),
      workersNeeded: data.workersNeeded,
      payPerWorker: data.payPerWorker ?? null,
      description: data.description ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      polygonGeoJson: data.polygonGeoJson ?? null,
    },
    include: {
      farmer: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify all available workers
  const workers = await prisma.user.findMany({ where: { role: 'WORKER' } });
  await Promise.all(
    workers.map((w) =>
      sendNotification(w.id, '🌾 New Job Posted', `${job.workName} at ${job.workAddress} on ${new Date(job.dateTime).toLocaleDateString()}`)
    )
  );

  return job;
};

/**
 * Accept a job (Worker only).
 * Business rules:
 *  - Job must be PENDING.
 *  - Worker cannot already be assigned to another job on the same date.
 *  - Job cannot exceed its worker capacity.
 */
export const acceptJob = async (jobId: string, workerId: string) => {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findUnique({
      where: { id: jobId },
      include: { 
        assignments: { where: { status: 'ASSIGNED' } },
        farmer: { select: { id: true, name: true, email: true } }
      },
    });

    if (!job) throw new Error('Job not found');
    if (job.status === 'CANCELLED') throw new Error('Job has been cancelled');
    if (job.status === 'COMPLETED') throw new Error('Job is already completed');

    // Capacity check
    if (job.assignments.length >= job.workersNeeded) {
      throw new Error('Job is already fully staffed');
    }

    // Conflict check: worker already has a job on same date?
    const conflictingJob = await tx.jobAssignment.findFirst({
      where: {
        workerId,
        status: 'ASSIGNED',
        job: {
          dateTime: {
            gte: new Date(new Date(job.dateTime).setHours(0, 0, 0, 0)),
            lt: new Date(new Date(job.dateTime).setHours(23, 59, 59, 999)),
          },
        },
      },
    });

    if (conflictingJob) {
      throw new Error('You already have a job assignment on that date');
    }

    // Create assignment
    const assignment = await tx.jobAssignment.create({
      data: { jobId, workerId },
    });

    // Update job status to ACCEPTED when first worker accepts
    if (job.status === 'PENDING') {
      await tx.job.update({ where: { id: jobId }, data: { status: 'ACCEPTED' } });
    }

    // Get the worker details for contact info
    const worker = await tx.user.findUnique({
      where: { id: workerId },
      select: { name: true, email: true }
    });

    // Notify the farmer with worker contact details
    await sendNotification(
      job.farmerId,
      '✅ Worker Accepted Your Job',
      `Worker ${worker?.name || 'Worker'} has accepted "${job.workName}". Contact: ${worker?.email || 'N/A'}`
    );

    // Notify the worker with farmer contact details
    await sendNotification(
      workerId,
      '📞 Farmer Contact Info',
      `You accepted "${job.workName}". Farmer: ${job.farmer.name}. Contact: ${job.farmer.email}`
    );

    return assignment;
  });
};

/**
 * Complete a job (Farmer only).
 */
export const completeJob = async (jobId: string, userId: string, role: string) => {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { assignments: { where: { status: 'ASSIGNED' } } } });
  if (!job) throw new Error('Job not found');
  if (role?.toUpperCase() !== 'ADMIN' && job.farmerId !== userId) throw new Error('Forbidden');
  if (job.status === 'COMPLETED') throw new Error('Already completed');

  // Auto-checkout all workers who haven't checked out yet upon job completion
  await prisma.jobAssignment.updateMany({
    where: {
      jobId,
      checkOutAt: null
    },
    data: {
      checkOutAt: new Date()
    }
  });

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'COMPLETED' },
  });

  // Notify all workers assigned to this job
  await Promise.all(
    job.assignments.map((a) =>
      sendNotification(a.workerId, '🏆 Job Completed', `The job "${job.workName}" has been marked as complete.`)
    )
  );

  return updated;
};

/**
 * Cancel a job (Farmer or Admin).
 */
export const cancelJob = async (jobId: string, userId: string, role: string) => {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { assignments: { where: { status: 'ASSIGNED' } } } });
  if (!job) throw new Error('Job not found');
  if (role?.toUpperCase() !== 'ADMIN' && job.farmerId !== userId) throw new Error('Forbidden');

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'CANCELLED' },
  });

  // Notify assigned workers and the farmer of cancellation
  await Promise.all([
    ...job.assignments.map((a) =>
      sendNotification(a.workerId, '❌ Job Cancelled', `The job "${job.workName}" has been cancelled.`)
    ),
    sendNotification(job.farmerId, '❌ Job Cancelled', `The job "${job.workName}" has been cancelled.`)
  ]);

  return updated;
};

/**
 * Reject a job (Worker only).
 */
export const rejectJob = async (jobId: string, workerId: string) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');

  return prisma.jobRejection.create({
    data: { jobId, workerId },
  });
};

/**
 * Check-in a worker (Attendance)
 */
export const checkIn = async (jobId: string, workerId: string, lat?: number, lng?: number) => {
  const assignment = await prisma.jobAssignment.findUnique({
    where: { jobId_workerId: { jobId, workerId } },
    include: { job: true }
  });
  if (!assignment) throw new Error('Assignment not found');

  if (lat && lng && assignment.job.lat && assignment.job.lng) {
    const turf = await import('@turf/turf');
    const from = turf.point([lng, lat]);
    const to = turf.point([assignment.job.lng, assignment.job.lat]);
    const distance = turf.distance(from, to, { units: 'meters' });

    if (distance > (assignment.job.arrivalRadius || 100)) {
      throw new Error(`Worker is too far away. Must be within ${assignment.job.arrivalRadius || 100} meters.`);
    }
  }

  // Mark job as IN_PROGRESS if it was ACCEPTED
  if (assignment.job.status === 'ACCEPTED') {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'IN_PROGRESS' }
    });
  }

  const updated = await prisma.jobAssignment.update({
    where: { id: assignment.id },
    data: { checkInAt: new Date() }
  });

  sendNotification(assignment.job.farmerId, '📍 Worker Arrived', `A worker has checked in for "${assignment.job.workName}".`);
  return updated;
};

/**
 * Check-out a worker
 */
export const checkOut = async (jobId: string, workerId: string) => {
  const assignment = await prisma.jobAssignment.findUnique({
    where: { jobId_workerId: { jobId, workerId } },
    include: { job: true }
  });
  if (!assignment) throw new Error('Assignment not found');

  const updated = await prisma.jobAssignment.update({
    where: { id: assignment.id },
    data: { checkOutAt: new Date() }
  });

  sendNotification(assignment.job.farmerId, '✅ Worker Finished', `A worker has checked out of "${assignment.job.workName}".`);
  return updated;
};
