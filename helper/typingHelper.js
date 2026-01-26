class TypingHelper {
  constructor(baseSpeed = 500, settings = {}) {
    this.baseSpeed = baseSpeed;
    this.settings = {
      makeMistakesProbability: settings.makeMistakesProbability || 0.3,
      mistakeCorrectionDelay: settings.mistakeCorrectionDelay || { min: 500, max: 1500 },
      pauseBetweenWords: settings.pauseBetweenWords || { min: 500, max: 2000 },
      fieldPause: settings.fieldPause || { min: 1000, max: 3000 }
    };
    
    // Define typing patterns based on speed
    this.patterns = this.createPatterns(baseSpeed);
  }

  createPatterns(baseSpeed) {
    return [
      { probability: 0.15, min: Math.floor(baseSpeed * 0.2), max: Math.floor(baseSpeed * 0.6) },
      { probability: 0.45, min: Math.floor(baseSpeed * 0.3), max: Math.floor(baseSpeed * 0.8) },
      { probability: 0.75, min: Math.floor(baseSpeed * 0.8), max: Math.floor(baseSpeed * 1) },
      { probability: 1.0, min: Math.floor(baseSpeed * 1.6), max: Math.floor(baseSpeed * 2) }
    ];
  }

  getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getTypingDelay() {
    const random = Math.random();
    for (const pattern of this.patterns) {
      if (random < pattern.probability) {
        return this.getRandomInRange(pattern.min, pattern.max);
      }
    }
    return this.baseSpeed;
  }

  getPauseBetweenWords() {
    return this.getRandomInRange(
      this.settings.pauseBetweenWords.min,
      this.settings.pauseBetweenWords.max
    );
  }

  getFieldPause() {
    return this.getRandomInRange(
      this.settings.fieldPause.min,
      this.settings.fieldPause.max
    );
  }

  getMistakeCorrectionDelay() {
    return this.getRandomInRange(
      this.settings.mistakeCorrectionDelay.min,
      this.settings.mistakeCorrectionDelay.max
    );
  }

  shouldMakeMistake() {
    return Math.random() < this.settings.makeMistakesProbability;
  }

  getRandomChar() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  async simulateTyping(page, selector, text) {
    const shouldMakeMistakes = this.shouldMakeMistake();
    let charsTyped = 0;

    for (let i = 0; i < text.length; i++) {
      const charDelay = this.getTypingDelay();
      let currentChar = text[i];

      // Simulate typing mistake
      if (shouldMakeMistakes && Math.random() < 0.1) {
        const randomChar = this.getRandomChar();
        await page.type(selector, randomChar, { delay: charDelay });
        
        // Wait before correction
        await new Promise(resolve => 
          setTimeout(resolve, this.getMistakeCorrectionDelay())
        );
        
        // Correct mistake
        await page.keyboard.press('Backspace');
      }

      // Type actual character
      await page.type(selector, currentChar, { delay: charDelay });
      charsTyped++;

      // Random pause between words
      if (charsTyped % this.getRandomInRange(3, 7) === 0) {
        const pause = this.getPauseBetweenWords();
        await new Promise(resolve => setTimeout(resolve, pause));
      }
    }

    // Pause after completing field
    const fieldPause = this.getFieldPause();
    await new Promise(resolve => setTimeout(resolve, fieldPause));
  }
}

module.exports = TypingHelper;