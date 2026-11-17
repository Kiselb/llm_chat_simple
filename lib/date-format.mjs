const RUSSIAN_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/**
 * Форматирует дату как «день месяца месяц прописью год».
 * @param {Date} date
 * @returns {string}
 */
export function formatCurrentDate(date) {
  return `${date.getDate()} ${RUSSIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
