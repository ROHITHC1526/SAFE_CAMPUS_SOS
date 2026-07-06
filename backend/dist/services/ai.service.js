"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateThreatScore = calculateThreatScore;
exports.detectFakeSOS = detectFakeSOS;
exports.recommendResponder = recommendResponder;
exports.generateIncidentSummary = generateIncidentSummary;
exports.getEmergencyGuidance = getEmergencyGuidance;
const server_1 = require("../server");
// Threat Severity Prediction
function calculateThreatScore(category, _latitude, _longitude) {
    const categoryScores = {
        VIOLENCE: 95,
        FIRE: 90,
        MEDICAL: 85,
        HARASSMENT: 75,
        RAGGING: 70,
        ACCIDENT: 80,
        THEFT: 50,
        OTHER: 40,
    };
    let score = categoryScores[category] || 40;
    // Time-based factor: higher risk at night
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
        score = Math.min(100, score + 10);
    }
    // Weekend factor
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
        score = Math.min(100, score + 5);
    }
    return Math.round(score);
}
// Fake SOS Detection
async function detectFakeSOS(userId, category) {
    // Check recent SOS frequency - more than 3 in last hour is suspicious
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentIncidents = await server_1.prisma.incident.count({
        where: {
            studentId: userId,
            createdAt: { gte: oneHourAgo },
        },
    });
    if (recentIncidents >= 3)
        return true;
    // Check for resolved false alarms
    const falseAlarms = await server_1.prisma.incident.count({
        where: {
            studentId: userId,
            status: 'FALSE_ALARM',
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
    });
    if (falseAlarms >= 2)
        return true;
    // Check cancelled incidents
    const cancelledRecent = await server_1.prisma.incident.count({
        where: {
            studentId: userId,
            status: 'CANCELLED',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
    });
    if (cancelledRecent >= 3)
        return true;
    return false;
}
// Responder Recommendation
async function recommendResponder(incidentLat, incidentLng) {
    const availableGuards = await server_1.prisma.securityGuard.findMany({
        where: { status: 'AVAILABLE' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (availableGuards.length === 0)
        return null;
    // Calculate distances and sort
    const guardsWithDistance = availableGuards
        .filter(g => g.currentLat && g.currentLng)
        .map(guard => ({
        userId: guard.userId,
        distance: haversineDistance(incidentLat, incidentLng, guard.currentLat, guard.currentLng),
        rating: guard.rating,
        totalResolved: guard.totalResolved,
    }))
        .sort((a, b) => {
        // Weighted score: 70% distance, 20% rating, 10% experience
        const scoreA = a.distance * 0.7 - a.rating * 0.2 - a.totalResolved * 0.001;
        const scoreB = b.distance * 0.7 - b.rating * 0.2 - b.totalResolved * 0.001;
        return scoreA - scoreB;
    });
    if (guardsWithDistance.length === 0) {
        // Fallback: return any available guard
        return { userId: availableGuards[0].userId, distance: 1.0 };
    }
    return {
        userId: guardsWithDistance[0].userId,
        distance: Math.round(guardsWithDistance[0].distance * 100) / 100,
    };
}
// Incident Summarization
function generateIncidentSummary(incident) {
    const duration = incident.resolvedAt
        ? Math.round((new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()) / 60000)
        : 'N/A';
    return `${incident.category} incident reported at ${new Date(incident.createdAt).toLocaleString()}. ` +
        `Severity: ${incident.severity}. ` +
        `Location: ${incident.address || `${incident.latitude}, ${incident.longitude}`}. ` +
        `Response time: ${duration} minutes. ` +
        `Status: ${incident.status}.`;
}
// Emergency Guidance
function getEmergencyGuidance(category) {
    const guidance = {
        MEDICAL: [
            'Stay calm and assess the situation.',
            'Do not move the injured person unless necessary.',
            'Apply pressure to any bleeding wounds.',
            'Check breathing and pulse.',
            'Keep the person warm and comfortable.',
            'Help is on the way. Stay with the person.',
        ],
        FIRE: [
            'Activate the nearest fire alarm.',
            'Evacuate the building immediately using stairs.',
            'Do not use elevators.',
            'Stay low to avoid smoke inhalation.',
            'If trapped, seal door gaps and signal for help.',
            'Gather at the designated assembly point.',
        ],
        HARASSMENT: [
            'Move to a safe, well-lit, public area.',
            'Do not confront the harasser alone.',
            'Try to note the appearance and details of the person.',
            'If possible, take photos or video discreetly.',
            'Stay on the line. Help is being dispatched.',
            'Your safety is our priority.',
        ],
        RAGGING: [
            'Stay calm and do not retaliate.',
            'Move away from the situation if possible.',
            'Try to reach a faculty member or safe zone.',
            'Document details for the report.',
            'Security is being notified immediately.',
            'You are not alone. We are here to help.',
        ],
        ACCIDENT: [
            'Do not move injured individuals.',
            'Check for hazards before approaching.',
            'Call for help and keep the area clear.',
            'Apply first aid if trained.',
            'Note the details of the accident.',
            'Emergency responders are on the way.',
        ],
        THEFT: [
            'Do not chase or confront the thief.',
            'Note the appearance and direction of escape.',
            'Preserve any evidence at the scene.',
            'Check CCTV coverage in the area.',
            'Security has been alerted.',
            'File a detailed report when safe.',
        ],
        VIOLENCE: [
            'Get to safety immediately.',
            'Lock or barricade doors if indoors.',
            'Stay away from windows.',
            'Call for help using any available means.',
            'Do not confront aggressive individuals.',
            'Security and police are being notified.',
        ],
        OTHER: [
            'Stay calm and assess your surroundings.',
            'Move to a safe location if possible.',
            'Security is being notified.',
            'Provide as many details as possible.',
            'Help is on the way.',
        ],
    };
    return guidance[category] || guidance.OTHER;
}
// Haversine distance calculation (km)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
//# sourceMappingURL=ai.service.js.map