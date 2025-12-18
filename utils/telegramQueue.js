const { delay } = require('./helpers');

class TelegramQueue {
    constructor(bot, minDelay = 500) {
        this.bot = bot;
        this.minDelay = minDelay;
        this.queue = [];
        this.isProcessing = false;
    }

    async sendMessage(chatId, text, options = {}) {
        return this.enqueue({ type: 'message', chatId, text, options });
    }

    async sendDocument(chatId, document, options = {}) {
        return this.enqueue({ type: 'document', chatId, document, options });
    }

    enqueue(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            if (!this.isProcessing) this.processQueue();
        });
    }

    async processQueue() {
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const { task, resolve, reject } = this.queue.shift();
            try {
                let res;
                if (task.type === 'message') {
                    res = await this.bot.sendMessage(task.chatId, task.text, task.options);
                } else if (task.type === 'document') {
                    res = await this.bot.sendDocument(task.chatId, task.document, task.options);
                }
                resolve(res);
            } catch (err) {
                reject(err);
            }
            await delay(this.minDelay);
        }
        this.isProcessing = false;
    }
}

module.exports = TelegramQueue;
