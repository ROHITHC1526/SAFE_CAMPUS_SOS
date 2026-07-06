export function getEmergencyGuidance(category: string): string[] {
  const guidance: Record<string, string[]> = {
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
