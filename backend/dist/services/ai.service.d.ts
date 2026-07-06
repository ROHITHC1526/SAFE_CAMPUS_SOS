export declare function calculateThreatScore(category: string, _latitude: number, _longitude: number): number;
export declare function detectFakeSOS(userId: string, category: string): Promise<boolean>;
export declare function recommendResponder(incidentLat: number, incidentLng: number): Promise<{
    userId: string;
    distance: number;
} | null>;
export declare function generateIncidentSummary(incident: any): string;
export declare function getEmergencyGuidance(category: string): string[];
//# sourceMappingURL=ai.service.d.ts.map