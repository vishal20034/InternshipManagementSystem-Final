const TENURE_DAYS = {
  '1week': 7,
  '15days': 15,
  '1month': 30,
  '45days': 45,
  '3months': 90,
  '6months': 180
};

function getTenureDays(tenure) {
  if (!tenure) return 30;
  const normalized = String(tenure).toLowerCase().replace(/\s+/g, '');
  return TENURE_DAYS[normalized] || 30;
}

function calculateAttendancePercentage(student, presentCount) {
  if (!student || !student.joiningDate) return 0;
  const totalTenureDays = getTenureDays(student.tenure || student.v2DurationType);
  const joiningDate = new Date(student.joiningDate);
  const today = new Date();
  
  // Align to midnight local time to avoid fractional days issues
  joiningDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  
  const daysElapsed = Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24)) + 1;
  if (daysElapsed <= 0) return 100;
  
  const expectedDays = Math.min(daysElapsed, totalTenureDays);
  return Math.min(Math.round((presentCount / expectedDays) * 100), 100);
}

function has75PercentAttendance(student, presentCount) {
  if (!student || !student.joiningDate) return false;
  const totalTenureDays = getTenureDays(student.tenure || student.v2DurationType);
  const joiningDate = new Date(student.joiningDate);
  const today = new Date();
  
  joiningDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  
  const daysElapsed = Math.min(
    Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24)) + 1,
    totalTenureDays
  );
  if (daysElapsed <= 0) return true;
  
  return presentCount >= Math.ceil(daysElapsed * 0.75);
}

module.exports = { TENURE_DAYS, getTenureDays, calculateAttendancePercentage, has75PercentAttendance };
