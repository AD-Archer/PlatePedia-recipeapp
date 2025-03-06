// Mock models for JSON-only version

// Base mock model with common methods
class MockModel {
  static findAll() { return Promise.resolve([]); }
  static findOne() { return Promise.resolve(null); }
  static findByPk() { return Promise.resolve(null); }
  static create() { return Promise.resolve({}); }
  static update() { return Promise.resolve([0]); }
  static destroy() { return Promise.resolve(0); }
  static bulkCreate() { return Promise.resolve([]); }
  static count() { return Promise.resolve(0); }
}

// Mock User model
export class User extends MockModel {
  static associate() {}
}

// Mock Recipe model
export class Recipe extends MockModel {
  static associate() {}
}

// Mock Category model
export class Category extends MockModel {
  static associate() {}
}

// Mock SavedRecipe model
export class SavedRecipe extends MockModel {
  static associate() {}
}

// Mock UserFollows model
export class UserFollows extends MockModel {
  static associate() {}
}

console.log('Using mock models (JSON-only mode)');