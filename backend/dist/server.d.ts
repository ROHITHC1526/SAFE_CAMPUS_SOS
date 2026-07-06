import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
declare const app: import("express-serve-static-core").Express;
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare const io: SocketServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { io };
export default app;
//# sourceMappingURL=server.d.ts.map