export function getNextRequestNumber(requestNumbers: string[]) {
  const highestNumber = requestNumbers.reduce((highest, requestNumber) => {
    const match = requestNumber.match(/^REQ-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `REQ-${String(highestNumber + 1).padStart(4, "0")}`;
}
