import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function initializeSocket(io: Server): void {
  // Authentication middleware
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        id: string;
        role: string;
      };
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`📡 User connected: ${socket.userId} (${socket.userRole})`);

    // Join personal room
    socket.join(`user_${socket.userId}`);

    // Join role-based rooms
    if (socket.userRole === 'SECURITY') {
      socket.join('security_room');
    }
    if (socket.userRole === 'ADMIN') {
      socket.join('admin_room');
    }

    // ─── Location Streaming ────────────────────────────────────
    
    // Start tracking session
    socket.on('location:start', async (data: { incidentId: string }) => {
      try {
        await prisma.liveLocation.updateMany({
          where: { userId: socket.userId!, incidentId: data.incidentId, isActive: true },
          data: { isActive: false },
        });
        console.log(`📡 GPS Tracking session started: user ${socket.userId} on incident ${data.incidentId}`);
      } catch (error) {
        console.error('Error starting location stream:', error);
      }
    });

    // Update location coordinates and save to DB
    socket.on('location:update', async (data: { 
      latitude: number; 
      longitude: number; 
      accuracy?: number; 
      speed?: number; 
      heading?: number; 
      incidentId: string;
    }) => {
      try {
        // Save update in database
        await prisma.liveLocation.create({
          data: {
            userId: socket.userId!,
            incidentId: data.incidentId,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            speed: data.speed,
            heading: data.heading,
            isActive: true,
          },
        });

        // If the sender is a security guard, update their current status coordinates
        if (socket.userRole === 'SECURITY') {
          await prisma.securityGuard.updateMany({
            where: { userId: socket.userId },
            data: { currentLat: data.latitude, currentLng: data.longitude },
          });
        }

        // 1. Send update strictly to admin dashboard room
        io.to('admin_room').emit('location:update', {
          userId: socket.userId,
          role: socket.userRole,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          speed: data.speed,
          heading: data.heading,
          incidentId: data.incidentId,
          timestamp: new Date(),
        });

        // 2. Resolve incident assignments to find active responders
        const incident = await prisma.incident.findUnique({
          where: { id: data.incidentId },
          select: { studentId: true },
        });

        const assignments = await prisma.responderAssignment.findMany({
          where: { incidentId: data.incidentId, completedAt: null },
          select: { responderId: true },
        });

        // 3. If sender is the student, broadcast to assigned responders
        if (incident && socket.userId === incident.studentId) {
          assignments.forEach((assign) => {
            io.to(`user_${assign.responderId}`).emit('location:update', {
              userId: socket.userId,
              role: socket.userRole,
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy,
              speed: data.speed,
              heading: data.heading,
              incidentId: data.incidentId,
              timestamp: new Date(),
            });
          });
        }

        // 4. If sender is a responder, broadcast to the student
        if (incident && socket.userRole === 'SECURITY') {
          io.to(`user_${incident.studentId}`).emit('location:update', {
            userId: socket.userId,
            role: socket.userRole,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            speed: data.speed,
            heading: data.heading,
            incidentId: data.incidentId,
            timestamp: new Date(),
          });
        }

        // 5. Also broadcast to general incident chat details room for any active listeners
        io.to(`incident_${data.incidentId}`).emit('location:update', {
          userId: socket.userId,
          role: socket.userRole,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          speed: data.speed,
          heading: data.heading,
          incidentId: data.incidentId,
          timestamp: new Date(),
        });

      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Stop tracking session
    socket.on('location:stop', async (data: { incidentId: string }) => {
      try {
        await prisma.liveLocation.updateMany({
          where: { userId: socket.userId!, incidentId: data.incidentId, isActive: true },
          data: { isActive: false },
        });

        io.to(`incident_${data.incidentId}`).emit('location:stopped', {
          userId: socket.userId,
          incidentId: data.incidentId,
        });
        console.log(`📡 GPS Tracking session stopped: user ${socket.userId} on incident ${data.incidentId}`);
      } catch (error) {
        console.error('Error stopping location stream:', error);
      }
    });

    // ─── Join Incident Room ────────────────────────────────────
    socket.on('incident:join', (incidentId: string) => {
      socket.join(`incident_${incidentId}`);
      console.log(`📍 User ${socket.userId} joined incident ${incidentId}`);
    });

    socket.on('incident:leave', (incidentId: string) => {
      socket.leave(`incident_${incidentId}`);
    });

    // ─── Chat ──────────────────────────────────────────────────
    socket.on('chat:send', async (data: { incidentId: string; content: string; type?: string; fileUrl?: string }) => {
      try {
        const message = await prisma.chatMessage.create({
          data: {
            incidentId: data.incidentId,
            senderId: socket.userId!,
            content: data.content,
            type: data.type || 'text',
            fileUrl: data.fileUrl,
          },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          },
        });

        // Emit message to room
        io.to(`incident_${data.incidentId}`).emit('chat:message', message);

        // Fetch incident details to connect notification
        const incident = await prisma.incident.findUnique({
          where: { id: data.incidentId },
          include: { assignments: { where: { completedAt: null } } },
        });

        if (incident) {
          if (socket.userId === incident.studentId) {
            // Student is sending. Send notifications to all active assigned responders.
            const responderPromises = incident.assignments.map(async (assign) => {
              const notif = await prisma.notification.create({
                data: {
                  userId: assign.responderId,
                  type: 'CHAT_MESSAGE',
                  title: `💬 Message from Student`,
                  message: data.content.slice(0, 100),
                  data: { incidentId: data.incidentId, type: 'CHAT_MESSAGE' },
                },
              });
              io.to(`user_${assign.responderId}`).emit('notification:new', notif);
            });
            await Promise.all(responderPromises);
          } else {
            // Responder or Admin is sending. Send notification to the student.
            const notif = await prisma.notification.create({
              data: {
                userId: incident.studentId,
                type: 'CHAT_MESSAGE',
                title: `💬 Message from Security`,
                message: data.content.slice(0, 100),
                data: { incidentId: data.incidentId, type: 'CHAT_MESSAGE' },
              },
            });
            io.to(`user_${incident.studentId}`).emit('notification:new', notif);
          }
        }
      } catch (error) {
        console.error('Chat send error:', error);
      }
    });

    socket.on('chat:typing', (data: { incidentId: string; isTyping: boolean }) => {
      socket.broadcast.to(`incident_${data.incidentId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    socket.on('chat:read', async (data: { incidentId: string }) => {
      try {
        await prisma.chatMessage.updateMany({
          where: { incidentId: data.incidentId, senderId: { not: socket.userId }, isRead: false },
          data: { isRead: true },
        });
        io.to(`incident_${data.incidentId}`).emit('chat:read', { userId: socket.userId });
      } catch (error) {
        console.error('Chat read error:', error);
      }
    });

    // ─── WebRTC Signaling ──────────────────────────────────────
    socket.on('call:offer', (data: { to: string; offer: any; type: string; incidentId: string }) => {
      io.to(`user_${data.to}`).emit('call:offer', {
        from: socket.userId,
        offer: data.offer,
        type: data.type,
        incidentId: data.incidentId,
      });
    });

    socket.on('call:answer', (data: { to: string; answer: any }) => {
      io.to(`user_${data.to}`).emit('call:answer', {
        from: socket.userId,
        answer: data.answer,
      });
    });

    socket.on('call:ice-candidate', (data: { to: string; candidate: any }) => {
      io.to(`user_${data.to}`).emit('call:ice-candidate', {
        from: socket.userId,
        candidate: data.candidate,
      });
    });

    socket.on('call:end', (data: { to: string; incidentId: string }) => {
      io.to(`user_${data.to}`).emit('call:ended', {
        from: socket.userId,
        incidentId: data.incidentId,
      });
    });

    // ─── Guard Status Updates ──────────────────────────────────
    socket.on('guard:status', async (data: { status: string }) => {
      try {
        await prisma.securityGuard.updateMany({
          where: { userId: socket.userId },
          data: { status: data.status as any },
        });
        io.to('admin_room').emit('guard:statusUpdated', {
          userId: socket.userId,
          status: data.status,
        });
      } catch (error) {
        console.error('Guard status error:', error);
      }
    });

    // ─── Disconnect ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`📴 User disconnected: ${socket.userId}`);
    });
  });
}
