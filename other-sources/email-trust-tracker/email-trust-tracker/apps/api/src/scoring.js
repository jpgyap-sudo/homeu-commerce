export function calculateLeadScore(stats) {
  const sent = Number(stats.sent_count || 0);
  const opens = Number(stats.open_count || 0);
  const clicks = Number(stats.click_count || 0);
  const rfqs = Number(stats.rfq_count || 0);
  const appointments = Number(stats.appointment_count || 0);

  const openScore = Math.min(opens * 2, 20);
  const clickScore = Math.min(clicks * 6, 30);
  const rfqScore = Math.min(rfqs * 25, 35);
  const appointmentScore = Math.min(appointments * 35, 40);
  const engagementPenalty = sent >= 10 && opens === 0 && clicks === 0 ? -25 : 0;

  return Math.max(0, Math.min(100, openScore + clickScore + rfqScore + appointmentScore + engagementPenalty));
}

export function classifyLead(score) {
  if (score >= 80) return 'hot';
  if (score >= 45) return 'warm';
  return 'cold';
}
