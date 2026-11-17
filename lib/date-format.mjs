const RUSSIAN_MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

/**
 * Форматирует дату как «год месяц прописью день месяца».
 * @param {Date} date
 * @returns {string}
 */
export function formatCurrentDate(date) {
  return `${date.getFullYear()} ${RUSSIAN_MONTHS[date.getMonth()]} ${date.getDate()}`;
}
