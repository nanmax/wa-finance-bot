const OpenAI = require('openai');

class AIService {
    constructor() {
        this.openai = null;
        this.isEnabled = true; // Default enabled
        this.apiKey = process.env.OPENAI_API_KEY || null;
        this.initOpenAI();
    }

    initOpenAI() {
        if (this.apiKey) {
            this.openai = new OpenAI({
                apiKey: this.apiKey
            });
        } else {
            console.log('⚠️ OpenAI API key tidak ditemukan, menggunakan pattern matching fallback');
        }
    }

    async analyzeFinanceMessage(message) {
        try {
            // Try AI analysis first if available and enabled
            if (this.isEnabled && this.openai) {
                const aiAnalysis = await this.analyzeWithAI(message);
                if (aiAnalysis) {
                    return aiAnalysis;
                }
            }

            // Fallback to pattern matching
            console.log('🔄 Menggunakan pattern matching fallback');
            return this.analyzeSimplePattern(message);

        } catch (error) {
            console.error('Error analyzing message:', error);
            // Fallback to pattern matching
            return this.analyzeSimplePattern(message);
        }
    }

    async analyzeWithAI(message) {
        try {
            // Check if OpenAI is properly initialized
            if (!this.openai) {
                console.log('⚠️ OpenAI tidak diinisialisasi, menggunakan pattern matching');
                return null;
            }

            const prompt = `Analisis pesan berikut dan tentukan apakah ini adalah transaksi keuangan (pemasukan atau pengeluaran). 
            Jika ya, ekstrak informasi berikut dalam format JSON:
            {
                "isFinancial": true/false,
                "type": "income/expense",
                "amount": number,
                "description": "string",
                "category": "string"
            }
            
            Kategori yang umum:
            - Pemasukan: Gaji, Bonus, Hadiah, Investasi, Penjualan
            - Pengeluaran: Makanan, Transport, Belanja, Tagihan, Hiburan, Kesehatan
            
            Pesan: "${message}"
            
            Jika bukan transaksi keuangan, kembalikan {"isFinancial": false}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Anda adalah asisten AI yang ahli dalam menganalisis transaksi keuangan. Berikan respons dalam format JSON yang valid."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            });

            const result = response.choices[0].message.content;
            
            // Parse JSON response
            let analysis;
            try {
                analysis = JSON.parse(result);
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                return null;
            }

            // Check if it's a financial transaction
            if (!analysis.isFinancial) {
                return null;
            }

            // Validate required fields
            if (!analysis.type || !analysis.amount || !analysis.description || !analysis.category) {
                console.log('AI response missing required fields:', analysis);
                return null;
            }

            // Ensure amount is a number
            analysis.amount = parseFloat(analysis.amount);
            if (isNaN(analysis.amount) || analysis.amount <= 0) {
                console.log('Invalid amount in AI response:', analysis);
                return null;
            }

            console.log('✅ AI Analysis:', analysis);
            return analysis;

        } catch (error) {
            console.error('Error analyzing message with AI:', error);
            return null;
        }
    }

    // Fallback method for simple pattern matching if AI fails
    analyzeSimplePattern(message) {
        console.log('🔍 Pattern matching untuk pesan:', message);
        
        // Enhanced patterns for Indonesian financial messages (Updated for modern times)
        const incomePatterns = [
            // Traditional Income Patterns
            { pattern: /gaji\s*(?:bulan\s*ini|sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gaji' },
            { pattern: /bonus\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Bonus' },
            { pattern: /bonus\s*(?:akhir\s*tahun|dari\s*perusahaan)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Bonus' },
            { pattern: /pendapatan\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Pendapatan' },
            { pattern: /pendapatan\s*dari\s*investasi\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Pendapatan' },
            { pattern: /pemasukan\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Pemasukan' },
            { pattern: /diterima\s*(?:transfer|uang)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transfer' },
            { pattern: /(?:dapat|terima)\s*(?:uang|gaji|bonus)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Pendapatan' },
            { pattern: /(?:rp|rupiah)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)\s*(?:untuk|dari|gaji|bonus)/i, category: 'Pendapatan' },
            { pattern: /gaji\s*sebesar\s*(?:rp\s*)?(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gaji' },
            { pattern: /dapat\s*bonus\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Bonus' },
            
            // Modern Digital Income Patterns
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:gopay|ovo|dana|linkaja|shopeepay)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Digital Payment' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:bca|mandiri|bni|bri|cimb)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Bank Transfer' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:paypal|payoneer|wise)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'International Transfer' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:freelance|project|kerja)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Freelance' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:online|internet|digital)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Online Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:youtube|tiktok|instagram|facebook)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Social Media Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:investasi|saham|reksadana|crypto)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Investment Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:trading|forex|bitcoin|ethereum)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Trading Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:rental|sewa|property)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Rental Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:hadiah|gift|reward)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gift/Reward' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:refund|kembalian|cashback)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Refund/Cashback' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:komisi|affiliate|referral)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Commission' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:penjualan|jual|toko|online)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Sales Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:bunga|interest|dividen)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Interest/Dividend' },
            
            // Modern Slang and Informal Patterns
            { pattern: /(?:dapet|dapet|dapetin)\s*(?:duit|uang|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Income' },
            { pattern: /(?:masuk|masukin)\s*(?:duit|uang|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Income' },
            { pattern: /(?:dapat|dapet)\s*(?:uang|duit|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Income' },
            { pattern: /(?:terima|terimain)\s*(?:uang|duit|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Income' },
            
            // Cryptocurrency and Modern Investment
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:btc|bitcoin|eth|ethereum|bnb|binance)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Crypto Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:nft|token|airdrop)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'NFT/Token Income' },
            
            // Modern Business Income
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:startup|business|usaha)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Business Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:consulting|konsultan)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Consulting Income' },
            { pattern: /(?:dapat|terima)\s*(?:dari|via)?\s*(?:course|kursus|training)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Course Income' }
        ];

        const expensePatterns = [
            // Traditional Expense Patterns
            { pattern: /belanja\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Belanja' },
            { pattern: /belanja\s*makan\s*(?:siang|malam)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Makanan' },
            { pattern: /makan\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Makanan' },
            { pattern: /transport\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /tagihan\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Tagihan' },
            { pattern: /pengeluaran\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Pengeluaran' },
            { pattern: /bayar\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Pembayaran' },
            { pattern: /(?:bayar|beli)\s*(?:makan|makanan)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Makanan' },
            { pattern: /(?:bayar|beli)\s*(?:transport|ongkos)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:bayar|beli)\s*(?:tagihan|listrik|air|internet)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Tagihan' },
            { pattern: /(?:rp|rupiah)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)\s*(?:untuk|beli|bayar)/i, category: 'Pengeluaran' },
            { pattern: /bayar\s*makan\s*(?:malam|siang)?\s*(?:rp\s*)?(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Makanan' },
            { pattern: /bayar\s*tagihan\s*(?:listrik|air|internet)?\s*(?:rp\s*)?(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Tagihan' },
            { pattern: /transport\s*ke\s*kantor\s*(?:rp\s*)?(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            
            // Modern Digital Expense Patterns
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:gopay|ovo|dana|linkaja|shopeepay)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Digital Payment' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:bca|mandiri|bni|bri|cimb)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Bank Transfer' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:paypal|payoneer|wise)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'International Payment' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:online|internet|digital)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Online Purchase' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:tokopedia|shopee|lazada|bukalapak)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'E-commerce' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:grab|gojek|uber)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:netflix|spotify|youtube|disney)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:steam|psn|xbox|nintendo)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gaming' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:amazon|google|apple)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Digital Services' },
            
            // Modern Lifestyle Expenses
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:gym|fitness|yoga|pilates)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Health & Fitness' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:coffee|kopi|starbucks|coffee\s*bean)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:restaurant|restoran|warung|food\s*court)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:cinema|bioskop|movie|film)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:concert|konser|music|musik)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:hotel|penginapan|accommodation)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Travel' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:flight|tiket|pesawat|travel)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Travel' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:shopping|mall|department\s*store)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Shopping' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:beauty|salon|spa|massage)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Beauty & Wellness' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:education|course|training|workshop)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Education' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:insurance|asuransi|protection)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Insurance' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:investment|investasi|saham|reksadana)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Investment' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:crypto|bitcoin|ethereum|trading)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Crypto Investment' },
            
            // Modern Bills and Subscriptions
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:electricity|listrik|pln)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Utilities' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:water|air|pdam)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Utilities' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:internet|wifi|indihome|firstmedia)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Internet' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:phone|hp|telkomsel|xl|indosat)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Phone Bill' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:gas|gas\s*elpiji|pertamina)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Utilities' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:rent|sewa|kost|apartment)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Housing' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:mortgage|kpr|cicilan\s*rumah)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Housing' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:car|mobil|motor|kendaraan)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:fuel|bensin|solar|pertamax)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:parking|parkir|tol)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            
            // Modern Healthcare Expenses
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:hospital|rumah\s*sakit|clinic|klinik)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Healthcare' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:doctor|dokter|medicine|obat)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Healthcare' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:dental|gigi|orthodontist)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Healthcare' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:pharmacy|apotek|drugstore)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Healthcare' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:vitamin|supplement|suplemen)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Healthcare' },
            
            // Modern Slang and Informal Patterns
            { pattern: /(?:keluar|keluarin|bayar|bayarin)\s*(?:duit|uang|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Expense' },
            { pattern: /(?:habis|habisin)\s*(?:duit|uang|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Expense' },
            { pattern: /(?:buang|buangin)\s*(?:duit|uang|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Expense' },
            { pattern: /(?:bayar|bayarin)\s*(?:duit|uang|money)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Expense' },
            
            // Informal Food & Snack Patterns
            { pattern: /(?:jajan|jajanin)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:makan|snack|cemilan)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:di|ke)?\s*(?:warung|toko|mall|food\s*court)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:dengan|via)?\s*(?:gopay|ovo|dana|cash)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:untuk|buat)?\s*(?:makan|snack|cemilan)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:di|ke)?\s*(?:starbucks|coffee|kopi|es\s*krim)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:di|ke)?\s*(?:restaurant|restoran|warung|kantin)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:di|ke)?\s*(?:food\s*court|mall|plaza|pasar)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:di|ke)?\s*(?:gojek|grab|food\s*delivery)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            { pattern: /(?:jajan|jajanin)\s*(?:di|ke)?\s*(?:online|tokopedia|shopee|gofood)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Food & Beverage' },
            
            // Informal Shopping Patterns
            { pattern: /(?:belanja|belanjain)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Shopping' },
            { pattern: /(?:belanja|belanjain)\s*(?:di|ke)?\s*(?:mall|toko|supermarket|minimarket)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Shopping' },
            { pattern: /(?:belanja|belanjain)\s*(?:di|ke)?\s*(?:online|tokopedia|shopee|lazada)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Shopping' },
            { pattern: /(?:belanja|belanjain)\s*(?:untuk|buat)?\s*(?:baju|pakaian|sepatu|aksesoris)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Shopping' },
            
            // Informal Transportation Patterns
            { pattern: /(?:ongkos|ongkosin)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:ongkos|ongkosin)\s*(?:ke|dari)?\s*(?:kantor|rumah|mall|kampus)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:ongkos|ongkosin)\s*(?:dengan|via)?\s*(?:grab|gojek|uber|taxi)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            { pattern: /(?:ongkos|ongkosin)\s*(?:dengan|via)?\s*(?:motor|mobil|bus|kereta)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Transport' },
            
            // Informal Entertainment Patterns
            { pattern: /(?:nonton|nontonin)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            { pattern: /(?:nonton|nontonin)\s*(?:di|ke)?\s*(?:bioskop|cinema|movie|film)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            { pattern: /(?:nonton|nontonin)\s*(?:di|ke)?\s*(?:netflix|spotify|youtube|streaming)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            { pattern: /(?:nonton|nontonin)\s*(?:di|ke)?\s*(?:konser|concert|music|musik)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Entertainment' },
            
            // Informal Gaming Patterns
            { pattern: /(?:game|gaming|main)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gaming' },
            { pattern: /(?:game|gaming|main)\s*(?:di|ke)?\s*(?:steam|psn|xbox|nintendo)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gaming' },
            { pattern: /(?:game|gaming|main)\s*(?:di|ke)?\s*(?:mobile|hp|android|ios)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Gaming' },
            
            // Informal Health & Beauty Patterns
            { pattern: /(?:salon|salonin)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Beauty & Wellness' },
            { pattern: /(?:salon|salonin)\s*(?:untuk|buat)?\s*(?:rambut|kuku|makeup|facial)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Beauty & Wellness' },
            { pattern: /(?:gym|fitness|olahraga)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Health & Fitness' },
            { pattern: /(?:gym|fitness|olahraga)\s*(?:di|ke)?\s*(?:fitness|gym|yoga|pilates)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Health & Fitness' },
            
            // Informal Education Patterns
            { pattern: /(?:kursus|kursusin)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Education' },
            { pattern: /(?:kursus|kursusin)\s*(?:untuk|buat)?\s*(?:bahasa|komputer|musik|seni)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Education' },
            { pattern: /(?:training|workshop|seminar)\s*(?:sebesar)?\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Education' },
            
            // Informal Technology Patterns
            { pattern: /(?:beli|beliin)\s*(?:hp|phone|laptop|computer)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            { pattern: /(?:beli|beliin)\s*(?:software|app|game|aplikasi)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            { pattern: /(?:beli|beliin)\s*(?:domain|hosting|website)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            
            // Modern Technology Expenses
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:laptop|computer|pc|macbook)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:phone|iphone|samsung|xiaomi)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:software|app|application)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:domain|hosting|website)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Technology' },
            
            // Modern Business Expenses
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:office|kantor|workspace)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Business' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:marketing|ads|advertising)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Business' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:tax|pajak|taxes)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Tax' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:legal|lawyer|advokat)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Legal' },
            { pattern: /(?:bayar|beli)\s*(?:dengan|via)?\s*(?:accounting|bookkeeping|akuntan)\s*(\d+(?:\.\d{3})*(?:\.\d{3})*)/i, category: 'Business' }
        ];

        // Check for income patterns
        console.log('🔍 Mencari pola pemasukan...');
        for (const { pattern, category } of incomePatterns) {
            const match = message.match(pattern);
            if (match) {
                console.log(`✅ Pola pemasukan ditemukan: ${category} - ${match[1]}`);
                const amount = this.parseAmount(match[1]);
                console.log(`💰 Amount parsed: ${amount}`);
                if (amount > 0) {
                    const result = {
                        type: 'income',
                        amount: amount,
                        description: message,
                        category: category
                    };
                    console.log('✅ Pattern matching result:', result);
                    return result;
                }
            }
        }

        // Check for expense patterns
        console.log('🔍 Mencari pola pengeluaran...');
        for (const { pattern, category } of expensePatterns) {
            const match = message.match(pattern);
            if (match) {
                console.log(`✅ Pola pengeluaran ditemukan: ${category} - ${match[1]}`);
                const amount = this.parseAmount(match[1]);
                console.log(`💰 Amount parsed: ${amount}`);
                if (amount > 0) {
                    const result = {
                        type: 'expense',
                        amount: amount,
                        description: message,
                        category: category
                    };
                    console.log('✅ Pattern matching result:', result);
                    return result;
                }
            }
        }

        console.log('❌ Tidak ada pola yang cocok');
        return null;
    }

    parseAmount(amountStr) {
        // Remove dots and convert to number
        const cleanAmount = amountStr.replace(/\./g, '');
        const amount = parseInt(cleanAmount);
        return isNaN(amount) ? 0 : amount;
    }

    // AI Control Methods
    enableAI() {
        this.isEnabled = true;
        console.log('✅ AI service enabled');
    }

    disableAI() {
        this.isEnabled = false;
        console.log('🔄 AI service disabled');
    }

    setAPIKey(apiKey) {
        this.apiKey = apiKey;
        this.initOpenAI();
        console.log('🔑 API key updated');
    }

    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasAPIKey: !!this.apiKey,
            hasOpenAI: !!this.openai
        };
    }
}

module.exports = AIService; 