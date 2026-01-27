const mongoose = require('mongoose');
class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/botData';
      
      this.connection = await mongoose.connect(MONGODB_URI);
      return this.connection;
    } catch (error) {
      console.error('MongoDB connection error:', erroar);
      throw new Error('Database connection failed');
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('mongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }
}

module.exports = new Database();