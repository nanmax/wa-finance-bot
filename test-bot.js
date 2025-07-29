const dotenv = require('dotenv');
const FinanceBot = require('./src/bot/FinanceBot');
const Database = require('./src/database/Database');
const AIService = require('./src/services/AIService');

// Load environment variables
dotenv.config();

class TestBot {
    constructor() {
        this.database = new Database();
        this.aiService = new AIService();
        this.financeBot = new FinanceBot(this.database, this.aiService);
    }

    async init() {
        await this.database.init();
        console.log('✅ Database initialized for testing');
    }

    async testMessage(message, author = 'Test User') {
        console.log(`\n🧪 Testing message: "${message}"`);
        console.log(`👤 Author: ${author}`);
        
        const result = await this.financeBot.processMessage(message, author);
        
        if (result) {
            console.log('✅ Bot Response:');
            console.log(result);
        } else {
            console.log('❌ No financial data detected');
        }
        
        return result;
    }

    async runTests() {
        console.log('🚀 Starting WhatsApp Finance Bot Tests');
        console.log('=====================================\n');

        await this.init();

        const testMessages = [
            // Income tests
            { message: 'Gaji bulan ini 5000000', expected: 'income' },
            { message: 'Bonus akhir tahun 2000000', expected: 'income' },
            { message: 'Diterima transfer 1000000', expected: 'income' },
            { message: 'Pendapatan dari investasi 500000', expected: 'income' },
            
            // Expense tests
            { message: 'Belanja makan siang 50000', expected: 'expense' },
            { message: 'Bayar tagihan listrik 300000', expected: 'expense' },
            { message: 'Transport ke kantor 25000', expected: 'expense' },
            { message: 'Bayar internet 200000', expected: 'expense' },
            
            // Complex patterns
            { message: 'Gaji sebesar Rp 5.000.000 diterima', expected: 'income' },
            { message: 'Bayar makan malam Rp 75.000', expected: 'expense' },
            { message: 'Dapat bonus 1.500.000 dari perusahaan', expected: 'income' },
            
            // Non-financial messages
            { message: 'Halo semua!', expected: null },
            { message: 'Meeting jam 2 siang', expected: null },
            { message: 'Terima kasih', expected: null }
        ];

        let passed = 0;
        let total = testMessages.length;

        for (const test of testMessages) {
            try {
                const result = await this.testMessage(test.message);
                
                if (test.expected === null && result === null) {
                    console.log('✅ PASS: Correctly ignored non-financial message');
                    passed++;
                } else if (test.expected && result && result.includes(test.expected === 'income' ? 'Pemasukan' : 'Pengeluaran')) {
                    console.log(`✅ PASS: Correctly detected ${test.expected}`);
                    passed++;
                } else {
                    console.log(`❌ FAIL: Expected ${test.expected}, got ${result ? 'response' : 'null'}`);
                }
            } catch (error) {
                console.log(`❌ ERROR: ${error.message}`);
            }
            
            console.log('---');
        }

        console.log(`\n📊 Test Results: ${passed}/${total} passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed');
        }

        // Show summary
        const summary = await this.database.getSummary();
        console.log('\n📈 Database Summary:');
        console.log(`Total Income: Rp ${summary.totalIncome.toLocaleString('id-ID')}`);
        console.log(`Total Expense: Rp ${summary.totalExpense.toLocaleString('id-ID')}`);
        console.log(`Balance: Rp ${summary.balance.toLocaleString('id-ID')}`);
        console.log(`Total Transactions: ${summary.totalTransactions}`);

        process.exit(0);
    }
}

// Run tests
const testBot = new TestBot();
testBot.runTests().catch(console.error); 