// MOCK DATABASE VERSION - No external dependencies!
// This was working perfectly before

// Mock data for development
const mockUsers = [
  { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' },
  { id: 2, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  { id: 3, name: 'Sarah Chen', email: 'sarah@example.com', role: 'user' },
];

// Mock query function that returns data without a real database
export const query = async (text: string, params?: any[]) => {
  console.log('🔧 [MOCK DB] Query:', text, params);
  
  // Return different mock data based on the query
  if (text.toLowerCase().includes('users')) {
    return {
      rows: mockUsers,
      rowCount: mockUsers.length
    };
  }
  
  if (text.toLowerCase().includes('user where')) {
    // Simulate finding a single user
    const email = params?.[0];
    const user = mockUsers.find(u => u.email === email);
    return {
      rows: user ? [user] : [],
      rowCount: user ? 1 : 0
    };
  }
  
  // Default empty response
  return { rows: [], rowCount: 0 };
};

// Mock getClient for transactions
export const getClient = async () => {
  return {
    query: async (text: string, params?: any[]) => {
      console.log('🔧 [MOCK DB] Transaction query:', text, params);
      return { rows: [], rowCount: 0 };
    },
    release: () => {}
  };
};

// Mock test connection (always succeeds)
export const testConnection = async () => {
  console.log('✅ [MOCK DB] Connected successfully (mock mode)');
  return true;
};

// Remove all dotenv and pg imports - they're not needed!
export default { query, getClient, testConnection };