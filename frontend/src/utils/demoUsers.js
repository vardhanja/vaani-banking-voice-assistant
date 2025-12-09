/**
 * Demo user credentials for testing and demonstration purposes.
 * 
 * These are the 100 users created by the seed script.
 * Customer numbers: SNB001000 to SNB001099
 * Password format: Sun@{last4digits}
 * 
 * Example:
 * - Customer Number: SNB001000
 * - Password: Sun@1000
 */

/**
 * Generate demo user credentials for all 100 users
 * @returns {Array<{customerNumber: string, password: string}>}
 */
export function generateDemoUsers() {
  const users = [];
  for (let i = 0; i < 100; i++) {
    const customerNumber = `SNB${String(i + 1000).padStart(6, '0')}`;
    const last4Digits = customerNumber.slice(-4);
    const password = `Sun@${last4Digits}`;
    users.push({
      customerNumber,
      password,
    });
  }
  return users;
}

/**
 * Get a random user from the demo users list
 * @returns {{customerNumber: string, password: string}}
 */
export function getRandomDemoUser() {
  const users = generateDemoUsers();
  const randomIndex = Math.floor(Math.random() * users.length);
  return users[randomIndex];
}

/**
 * Get all demo users (cached)
 * @returns {Array<{customerNumber: string, password: string}>}
 */
let cachedUsers = null;
export function getAllDemoUsers() {
  if (!cachedUsers) {
    cachedUsers = generateDemoUsers();
  }
  return cachedUsers;
}

