const moment = require('moment');

class FinanceBot {
    constructor(database, aiService, backupService, scheduledBackupService = null) {
        this.database = database;
        this.aiService = aiService;
        this.backupService = backupService;
        this.scheduledBackupService = scheduledBackupService;
    }

    async processMessage(message, author, contactName = null) {
        try {
            console.log(`🤖 Memproses pesan dari ${author}: ${message}`);
            
            // Check for report commands first
            const reportResponse = await this.handleReportCommands(message, author);
            if (reportResponse) {
                return reportResponse;
            }
            
            // Analyze message with AI
            const analysis = await this.aiService.analyzeFinanceMessage(message);
            
            if (!analysis) {
                return null; // No financial data detected
            }

            // Use contact name if available, otherwise use author
            const displayName = contactName || author || 'Unknown';
            
            console.log(`👤 Contact Info Debug:`);
            console.log(`  - Original author: ${author}`);
            console.log(`  - Contact name: ${contactName}`);
            console.log(`  - Display name: ${displayName}`);

            // Save to database
            const savedRecord = await this.database.saveTransaction({
                type: analysis.type, // 'income' atau 'expense'
                amount: analysis.amount,
                description: analysis.description,
                category: analysis.category,
                author: displayName, // Use display name instead of author
                timestamp: new Date(),
                original_message: message
            });

            // Generate response message
            const response = await this.generateResponse(analysis, savedRecord || { author: displayName });
            
            console.log(`✅ Transaksi tersimpan: ${analysis.type} - ${analysis.amount}`);
            return response;

        } catch (error) {
            console.error('Error processing message:', error);
            return '❌ Maaf, terjadi kesalahan dalam memproses pesan Anda.';
        }
    }

    async handleReportCommands(message, author) {
        const lowerMessage = message.toLowerCase().trim();
        
        // Summary report commands
        if (lowerMessage === 'summary' || lowerMessage === 'ringkasan' || lowerMessage === 'laporan') {
            return await this.generateSummaryReport();
        }
        
        // Detailed report commands
        if (lowerMessage === 'detail' || lowerMessage === 'detail' || lowerMessage === 'laporan detail') {
            return await this.generateDetailedReport();
        }
        
        // Monthly report commands
        if (lowerMessage.includes('bulan') || lowerMessage.includes('monthly') || lowerMessage.includes('laporan bulan')) {
            return await this.generateMonthlyReport();
        }
        
        // Weekly report commands
        if (lowerMessage.includes('minggu') || lowerMessage.includes('weekly') || lowerMessage.includes('laporan minggu')) {
            return await this.generateWeeklyReport();
        }
        
        // Today's report commands
        if (lowerMessage.includes('hari ini') || lowerMessage.includes('today') || lowerMessage.includes('laporan hari ini')) {
            return await this.generateTodayReport();
        }
        
        // Group management commands
        if (lowerMessage === 'admin' || lowerMessage === 'admin panel' || lowerMessage === 'panel admin') {
            return this.generateAdminPanel();
        }
        
        // Add group command
        if (lowerMessage.startsWith('add group') || lowerMessage.startsWith('tambah group') || lowerMessage.startsWith('daftar group')) {
            return await this.handleAddGroup(message, author);
        }
        
        // Remove group command
        if (lowerMessage.startsWith('remove group') || lowerMessage.startsWith('hapus group') || lowerMessage.startsWith('delete group')) {
            return await this.handleRemoveGroup(message, author);
        }
        
        // List groups command
        if (lowerMessage === 'list groups' || lowerMessage === 'daftar group' || lowerMessage === 'groups' || lowerMessage === 'group list') {
            return await this.handleListGroups();
        }
        
        // AI control commands
        if (lowerMessage === 'ai' || lowerMessage === 'ai control' || lowerMessage === 'control ai' || lowerMessage === 'ai panel') {
            return this.generateAIControlPanel();
        }
        
        // Enable AI command
        if (lowerMessage === 'enable ai' || lowerMessage === 'aktifkan ai' || lowerMessage === 'nyalakan ai' || lowerMessage === 'ai on') {
            return await this.handleEnableAI();
        }
        
        // Disable AI command
        if (lowerMessage === 'disable ai' || lowerMessage === 'nonaktifkan ai' || lowerMessage === 'matikan ai' || lowerMessage === 'ai off') {
            return await this.handleDisableAI();
        }
        
        // Set AI key command
        if (lowerMessage.startsWith('set ai key') || lowerMessage.startsWith('ai key') || lowerMessage.startsWith('set key')) {
            return await this.handleSetAIKey(message);
        }
        
        // Check AI status command
        if (lowerMessage === 'ai status' || lowerMessage === 'status ai' || lowerMessage === 'cek ai' || lowerMessage === 'ai info') {
            return await this.handleAICheckStatus();
        }
        
        // Backup & Restore commands
        if (lowerMessage === 'backup' || lowerMessage === 'buat backup' || lowerMessage === 'backup manual') {
            return await this.handleManualBackup();
        }
        
        if (lowerMessage === 'backup list' || lowerMessage === 'daftar backup' || lowerMessage === 'list backup') {
            return await this.handleBackupList();
        }
        
        if (lowerMessage === 'backup schedule' || lowerMessage === 'jadwal backup' || lowerMessage === 'scheduled backup') {
            return await this.handleBackupSchedule();
        }
        
        if (lowerMessage === 'restore' || lowerMessage === 'restore backup' || lowerMessage === 'pulihkan backup') {
            return await this.handleRestoreBackup();
        }
        
        if (lowerMessage === 'restore confirm' || lowerMessage === 'confirm restore') {
            return await this.handleRestoreConfirm();
        }
        
        if (lowerMessage === 'restore cancel' || lowerMessage === 'cancel restore') {
            return await this.handleRestoreCancel();
        }
        
        // Download backup commands
        if (lowerMessage.startsWith('download backup') || lowerMessage.startsWith('download')) {
            return await this.handleDownloadBackup(message);
        }
        
        // Send backup file commands
        if (lowerMessage.startsWith('send backup') || lowerMessage.startsWith('kirim backup')) {
            return await this.handleSendBackupFile(message);
        }
        
        // Scheduled backup management commands
        if (lowerMessage.startsWith('set backup group') || lowerMessage.startsWith('set group backup')) {
            return await this.handleSetBackupGroup(message);
        }
        
        if (lowerMessage === 'backup group status' || lowerMessage === 'status backup group') {
            return await this.handleBackupGroupStatus();
        }
        
        // Help commands
        if (lowerMessage === 'help' || lowerMessage === 'bantuan' || lowerMessage === 'menu') {
            return this.generateHelpMessage();
        }
        
        return null; // No report command detected
    }

    async generateSummaryReport() {
        try {
            const summary = await this.getSummary();
            const formattedIncome = this.formatCurrency(summary.totalIncome);
            const formattedExpense = this.formatCurrency(summary.totalExpense);
            const formattedBalance = this.formatCurrency(summary.balance);
            
            let response = `📊 *RINGKASAN KEUANGAN*\n\n`;
            response += `💰 *Total Pemasukan:* Rp ${formattedIncome}\n`;
            response += `💸 *Total Pengeluaran:* Rp ${formattedExpense}\n`;
            response += `💳 *Saldo:* Rp ${formattedBalance}\n\n`;
            response += `📅 *Periode:* Semua waktu\n`;            
            response += `📝 *Total Transaksi:* ${summary.transactionCount} (${summary.incomeCount} pemasukan, ${summary.expenseCount} pengeluaran)\n\n`;
            response += `💡 *Tips:* Ketik "detail" untuk laporan lengkap`;
            
            return response;
        } catch (error) {
            console.error('Error generating summary report:', error);
            return '❌ Maaf, terjadi kesalahan dalam membuat ringkasan.';
        }
    }

    async generateDetailedReport() {
        try {
            const report = await this.getDetailByDate(
                new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
                new Date().toISOString().split('T')[0] // Today
            );
            
            let response = `📋 *LAPORAN DETAIL KEUANGAN*\n\n`;
            
            // Summary section
            response += `📊 *RINGKASAN:*\n`;
            response += `💰 Total Pemasukan: Rp ${this.formatCurrency(report.summary.totalIncome)}\n`;
            response += `💸 Total Pengeluaran: Rp ${this.formatCurrency(report.summary.totalExpense)}\n`;
            response += `💳 Saldo: Rp ${this.formatCurrency(report.summary.totalIncome - report.summary.totalExpense)}\n`;
            response += `📝 Total Transaksi: ${report.summary.transactionCount} (${report.summary.incomeCount} pemasukan, ${report.summary.expenseCount} pengeluaran)\n\n`;
            
            // Income breakdown
            if (Object.keys(report.income.byCategory).length > 0) {
                response += `💰 *PEMASUKAN PER KATEGORI:*\n`;
                Object.keys(report.income.byCategory).forEach(category => {
                    const data = report.income.byCategory[category];
                    response += `• ${category}: Rp ${this.formatCurrency(data.total)} (${data.count} transaksi)\n`;
                });
                response += `\n`;
            }
            
            // Expense breakdown
            if (Object.keys(report.expense.byCategory).length > 0) {
                response += `💸 *PENGELUARAN PER KATEGORI:*\n`;
                Object.keys(report.expense.byCategory).forEach(category => {
                    const data = report.expense.byCategory[category];
                    response += `• ${category}: Rp ${this.formatCurrency(data.total)} (${data.count} transaksi)\n`;
                });
                response += `\n`;
            }
            
            response += `📅 *Periode:* ${report.period.startDate} s/d ${report.period.endDate}\n`;
            response += `\n`;
            // Tambahkan daftar transaksi pemasukan
            if (report.income.transactions.length > 0) {
                response += `🟢 *DAFTAR PEMASUKAN*\n`;
                report.income.transactions.forEach(t => {
                    const tgl = new Date(t.timestamp).toLocaleDateString('id-ID');
                    response += `• [${tgl}] ${t.description} - Rp ${this.formatCurrency(t.amount)}\n`;
                });
                response += `\n`;
            }
            // Tambahkan daftar transaksi pengeluaran
            if (report.expense.transactions.length > 0) {
                response += `🔴 *DAFTAR PENGELUARAN*\n`;
                report.expense.transactions.forEach(t => {
                    const tgl = new Date(t.timestamp).toLocaleDateString('id-ID');
                    response += `• [${tgl}] ${t.description} - Rp ${this.formatCurrency(t.amount)}\n`;
                });
                response += `\n`;
            }
            response += `💡 *Tips:* Ketik "bulan ini" untuk laporan bulanan`;
            return response;
        } catch (error) {
            console.error('Error generating detailed report:', error);
            return '❌ Maaf, terjadi kesalahan dalam membuat laporan detail.';
        }
    }

    async generateMonthlyReport() {
        try {
            const now = new Date();
            // Start of current month (1st day)
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            // End of current month (last day)
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            console.log(`📅 Monthly Report Period: ${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}`);
            
            const report = await this.getDetailByDate(
                startOfMonth.toISOString().split('T')[0],
                endOfMonth.toISOString().split('T')[0]
            );
            
            let response = `📅 *LAPORAN BULAN ${startOfMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()}*\n\n`;
            
            // Summary section
            response += `📊 *RINGKASAN:*\n`;
            response += `💰 Total Pemasukan: Rp ${this.formatCurrency(report.summary.totalIncome)}\n`;
            response += `💸 Total Pengeluaran: Rp ${this.formatCurrency(report.summary.totalExpense)}\n`;
            response += `💳 Saldo: Rp ${this.formatCurrency(report.summary.totalIncome - report.summary.totalExpense)}\n`;
            response += `📝 Total Transaksi: ${report.summary.transactionCount}\n\n`;
            
            // Check if no transactions this month
            if (report.summary.transactionCount === 0) {
                response += `📝 *STATUS:* Belum ada transaksi bulan ini\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Ketik transaksi keuangan untuk menambah data\n`;
                response += `• Contoh: "jajan 50000" atau "gaji 5000000"\n`;
                response += `• Ketik "minggu ini" untuk laporan mingguan\n\n`;
            }
            
            // Top categories
            if (Object.keys(report.expense.byCategory).length > 0) {
                response += `🏆 *TOP 3 PENGELUARAN:*\n`;
                const sortedCategories = Object.keys(report.expense.byCategory)
                    .map(category => ({ category, ...report.expense.byCategory[category] }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 3);
                
                sortedCategories.forEach((item, index) => {
                    response += `${index + 1}. ${item.category}: Rp ${this.formatCurrency(item.total)}\n`;
                });
                response += `\n`;
            }
            
            response += `📅 *Periode:* ${report.period.startDate} s/d ${report.period.endDate}\n`;
            response += `💡 *Tips:* Ketik "minggu ini" untuk laporan mingguan`;
            
            return response;
        } catch (error) {
            console.error('Error generating monthly report:', error);
            return '❌ Maaf, terjadi kesalahan dalam membuat laporan bulanan.';
        }
    }

    async generateWeeklyReport() {
        try {
            const now = new Date();
            // Get current day of week (0 = Sunday, 1 = Monday, etc.)
            const currentDay = now.getDay();
            // Calculate days to subtract to get to Sunday (start of week)
            const daysToSubtract = currentDay;
            
            // Start of current week (Sunday)
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - daysToSubtract);
            startOfWeek.setHours(0, 0, 0, 0);
            
            // End of current week (Saturday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            
            console.log(`📅 Weekly Report Period: ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);
            
            const report = await this.getDetailByDate(
                startOfWeek.toISOString().split('T')[0],
                endOfWeek.toISOString().split('T')[0]
            );
            
            let response = `📅 *LAPORAN MINGGU INI*\n\n`;
            
            // Summary section
            response += `📊 *RINGKASAN:*\n`;
            response += `💰 Total Pemasukan: Rp ${this.formatCurrency(report.summary.totalIncome)}\n`;
            response += `💸 Total Pengeluaran: Rp ${this.formatCurrency(report.summary.totalExpense)}\n`;
            response += `💳 Saldo: Rp ${this.formatCurrency(report.summary.totalIncome - report.summary.totalExpense)}\n`;
            response += `📝 Total Transaksi: ${report.summary.transactionCount}\n\n`;
            
            // Check if no transactions this week
            if (report.summary.transactionCount === 0) {
                response += `📝 *STATUS:* Belum ada transaksi minggu ini\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Ketik transaksi keuangan untuk menambah data\n`;
                response += `• Contoh: "jajan 50000" atau "gaji 5000000"\n`;
                response += `• Ketik "hari ini" untuk laporan harian\n\n`;
            }
            
            // Daily breakdown (if available)
            if (report.expense.transactions.length > 0) {
                response += `📅 *TRANSAKSI TERBARU:*\n`;
                const recentTransactions = report.expense.transactions
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 5);
                
                recentTransactions.forEach(transaction => {
                    const date = new Date(transaction.timestamp).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short' 
                    });
                    response += `• ${date}: ${transaction.description} - Rp ${this.formatCurrency(transaction.amount)}\n`;
                });
                response += `\n`;
            }
            
            response += `📅 *Periode:* ${report.period.startDate} s/d ${report.period.endDate}\n`;
            response += `💡 *Tips:* Ketik "hari ini" untuk laporan harian`;
            
            return response;
        } catch (error) {
            console.error('Error generating weekly report:', error);
            return '❌ Maaf, terjadi kesalahan dalam membuat laporan mingguan.';
        }
    }

    async generateTodayReport() {
        try {
            const today = new Date();
            // Use local date instead of UTC to handle timezone properly
            const todayStr = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');
            
            console.log(`📅 Today Report Date: ${todayStr}`);
            console.log(`📅 Today Timezone Offset: ${today.getTimezoneOffset()}`);
            console.log(`📅 Today Local: ${today.toLocaleDateString('id-ID')}`);
            console.log(`📅 Today UTC: ${today.toISOString()}`);
            
            const report = await this.getDetailByDate(todayStr, todayStr);
            
            let response = `📅 *LAPORAN HARI INI*\n\n`;
            
            // Summary section
            response += `📊 *RINGKASAN:*\n`;
            response += `💰 Total Pemasukan: Rp ${this.formatCurrency(report.summary.totalIncome)}\n`;
            response += `💸 Total Pengeluaran: Rp ${this.formatCurrency(report.summary.totalExpense)}\n`;
            response += `💳 Saldo: Rp ${this.formatCurrency(report.summary.totalIncome - report.summary.totalExpense)}\n`;
            response += `📝 Total Transaksi: ${report.summary.transactionCount}\n\n`;
            
            // Check if no transactions today
            if (report.summary.transactionCount === 0) {
                response += `📝 *STATUS:* Belum ada transaksi hari ini\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Ketik transaksi keuangan untuk menambah data\n`;
                response += `• Contoh: "jajan 50000" atau "gaji 5000000"\n`;
                response += `• Ketik "minggu ini" untuk laporan mingguan\n\n`;
            }
            
            // Today's transactions
            if (report.expense.transactions.length > 0) {
                response += `📝 *TRANSAKSI HARI INI:*\n`;
                report.expense.transactions.forEach(transaction => {
                    response += `• ${transaction.description} - Rp ${this.formatCurrency(transaction.amount)}\n`;
                });
                response += `\n`;
            }
            
            if (report.income.transactions.length > 0) {
                response += `💰 *PEMASUKAN HARI INI:*\n`;
                report.income.transactions.forEach(transaction => {
                    response += `• ${transaction.description} - Rp ${this.formatCurrency(transaction.amount)}\n`;
                });
                response += `\n`;
            }
            
            response += `📅 *Tanggal:* ${todayStr}\n`;
            response += `💡 *Tips:* Ketik "minggu ini" untuk laporan mingguan`;
            
            return response;
        } catch (error) {
            console.error('Error generating today report:', error);
            return '❌ Maaf, terjadi kesalahan dalam membuat laporan hari ini.';
        }
    }

    generateHelpMessage() {
        let response = `🤖 *FINANCE BOT - MENU BANTUAN*\n\n`;
        response += `📊 *LAPORAN KEUANGAN:*\n`;
        response += `• "summary" atau "ringkasan" - Ringkasan keuangan\n`;
        response += `• "detail" atau "laporan detail" - Laporan detail lengkap\n`;
        response += `• "bulan ini" atau "laporan bulan" - Laporan bulanan\n`;
        response += `• "minggu ini" atau "laporan minggu" - Laporan mingguan\n`;
        response += `• "hari ini" atau "laporan hari ini" - Laporan harian\n\n`;
        response += `👥 *ADMIN GROUP:*\n`;
        response += `• "admin" atau "admin panel" - Panel admin\n`;
        response += `• "add group [group_id]" - Tambah group\n`;
        response += `• "remove group [group_id]" - Hapus group\n`;
        response += `• "list groups" - Daftar group yang diizinkan\n\n`;
        response += `🤖 *AI CONTROL:*\n`;
        response += `• "ai" atau "ai control" - Panel kontrol AI\n`;
        response += `• "enable ai" atau "aktifkan ai" - Nyalakan AI\n`;
        response += `• "disable ai" atau "matikan ai" - Matikan AI\n`;
        response += `• "set ai key [key]" - Set API key AI\n`;
        response += `• "ai status" atau "status ai" - Cek status AI\n\n`;
        response += `📦 *BACKUP & RESTORE:*\n`;
        response += `• "backup" atau "buat backup" - Backup manual\n`;
        response += `• "backup list" atau "daftar backup" - Daftar backup\n`;
        response += `• "backup schedule" atau "jadwal backup" - Jadwal otomatis\n`;
        response += `• "set backup group [group_id] [schedule]" - Set group untuk backup otomatis\n`;
        response += `• "backup group status" - Cek status backup group\n`;
        response += `• "download backup [file.zip]" - Download file backup\n`;
        response += `• "restore" atau "restore backup" - Restore data\n\n`;
        response += `📝 *CARA MENGGUNAKAN:*\n`;
        response += `• Ketik salah satu command di atas untuk mendapatkan laporan\n`;
        response += `• Atau ketik transaksi keuangan seperti biasa\n`;
        response += `• Contoh: "jajan 50000" atau "gaji 5000000"\n\n`;
        response += `💡 *TIPS:*\n`;
        response += `• Gunakan "detail" untuk analisis lengkap\n`;
        response += `• Gunakan "bulan ini" untuk review bulanan\n`;
        response += `• Gunakan "hari ini" untuk monitoring harian\n`;
        response += `• Gunakan "admin" untuk mengelola group\n`;
        response += `• Gunakan "ai" untuk kontrol AI service`;
        
        return response;
    }

    generateAdminPanel() {
        let response = `🔧 *ADMIN PANEL - FINANCE BOT*\n\n`;
        response += `👥 *GROUP MANAGEMENT:*\n`;
        response += `• "add group [group_id]" - Tambah group baru\n`;
        response += `• "remove group [group_id]" - Hapus group\n`;
        response += `• "list groups" - Lihat daftar group yang diizinkan\n\n`;
        response += `📊 *LAPORAN KEUANGAN:*\n`;
        response += `• "summary" - Ringkasan keuangan\n`;
        response += `• "detail" - Laporan detail lengkap\n`;
        response += `• "bulan ini" - Laporan bulanan\n`;
        response += `• "minggu ini" - Laporan mingguan\n`;
        response += `• "hari ini" - Laporan harian\n\n`;
        response += `📝 *CARA MENGGUNAKAN:*\n`;
        response += `• Ketik command sesuai kebutuhan\n`;
        response += `• Contoh: "add group 123456789@g.us"\n`;
        response += `• Atau ketik transaksi keuangan seperti biasa\n\n`;
        response += `💡 *TIPS:*\n`;
        response += `• Group ID format: [number]@g.us\n`;
        response += `• Hanya group yang didaftarkan yang bisa menggunakan bot\n`;
        response += `• Ketik "help" untuk menu lengkap`;
        
        return response;
    }

    async handleAddGroup(message, author) {
        try {
            // Extract group ID from message
            const parts = message.split(' ');
            let groupId = null;
            
            // Find group ID in the message
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].includes('@g.us')) {
                    groupId = parts[i];
                    break;
                }
            }
            
            if (!groupId) {
                return `❌ *ERROR:* Group ID tidak ditemukan!\n\n`;
                response += `📝 *CARA PENGGUNAAN:*\n`;
                response += `• Ketik: "add group [group_id]"\n`;
                response += `• Contoh: "add group 123456789@g.us"\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Group ID harus berformat: [number]@g.us\n`;
                response += `• Dapatkan Group ID dari group WhatsApp\n`;
                response += `• Ketik "admin" untuk panel admin`;
            }
            
            // Validate group ID format
            if (!groupId.match(/^\d+@g\.us$/)) {
                return `❌ *ERROR:* Format Group ID tidak valid!\n\n`;
                response += `📝 *FORMAT YANG BENAR:*\n`;
                response += `• Contoh: 123456789@g.us\n`;
                response += `• Harus berakhir dengan @g.us\n`;
                response += `• Hanya angka sebelum @g.us`;
            }
            
            // Check if group already exists
            const config = await this.database.loadConfig();
            if (config.allowedGroups && config.allowedGroups.includes(groupId)) {
                return `⚠️ *INFO:* Group ${groupId} sudah terdaftar!\n\n`;
                response += `📝 *STATUS:* Group sudah diizinkan\n`;
                response += `💡 *TIPS:* Ketik "list groups" untuk melihat daftar lengkap`;
            }
            
            // Add group to allowed list
            if (!config.allowedGroups) {
                config.allowedGroups = [];
            }
            config.allowedGroups.push(groupId);
            await this.database.saveConfig(config);
            
            let response = `✅ *SUCCESS:* Group berhasil ditambahkan!\n\n`;
            response += `📝 *DETAILS:*\n`;
            response += `• Group ID: ${groupId}\n`;
            response += `• Status: Diizinkan\n`;
            response += `• Total Groups: ${config.allowedGroups.length}\n\n`;
            response += `💡 *TIPS:*\n`;
            response += `• Group sekarang bisa menggunakan bot\n`;
            response += `• Ketik "list groups" untuk melihat daftar\n`;
            response += `• Ketik "admin" untuk panel admin`;
            
            return response;
            
        } catch (error) {
            console.error('Error adding group:', error);
            return '❌ Maaf, terjadi kesalahan dalam menambahkan group.';
        }
    }

    async handleRemoveGroup(message, author) {
        try {
            // Extract group ID from message
            const parts = message.split(' ');
            let groupId = null;
            
            // Find group ID in the message
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].includes('@g.us')) {
                    groupId = parts[i];
                    break;
                }
            }
            
            if (!groupId) {
                let response = `❌ *ERROR:* Group ID tidak ditemukan!\n\n`;
                response += `📝 *CARA PENGGUNAAN:*\n`;
                response += `• Ketik: "remove group [group_id]"\n`;
                response += `• Contoh: "remove group 123456789@g.us"\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Group ID harus berformat: [number]@g.us\n`;
                response += `• Ketik "list groups" untuk melihat daftar\n`;
                response += `• Ketik "admin" untuk panel admin`;
                return response;
            }
            
            // Validate group ID format
            if (!groupId.match(/^\d+@g\.us$/)) {
                let response = `❌ *ERROR:* Format Group ID tidak valid!\n\n`;
                response += `📝 *FORMAT YANG BENAR:*\n`;
                response += `• Contoh: 123456789@g.us\n`;
                response += `• Harus berakhir dengan @g.us\n`;
                response += `• Hanya angka sebelum @g.us`;
                return response;
            }
            
            // Check if group exists
            const config = await this.database.loadConfig();
            if (!config.allowedGroups || !config.allowedGroups.includes(groupId)) {
                let response = `⚠️ *INFO:* Group ${groupId} tidak ditemukan!\n\n`;
                response += `📝 *STATUS:* Group tidak terdaftar\n`;
                response += `💡 *TIPS:* Ketik "list groups" untuk melihat daftar lengkap`;
                return response;
            }
            
            // Remove group from allowed list
            config.allowedGroups = config.allowedGroups.filter(id => id !== groupId);
            await this.database.saveConfig(config);
            
            let response = `✅ *SUCCESS:* Group berhasil dihapus!\n\n`;
            response += `📝 *DETAILS:*\n`;
            response += `• Group ID: ${groupId}\n`;
            response += `• Status: Dihapus\n`;
            response += `• Total Groups: ${config.allowedGroups.length}\n\n`;
            response += `💡 *TIPS:*\n`;
            response += `• Group tidak bisa menggunakan bot lagi\n`;
            response += `• Ketik "list groups" untuk melihat daftar\n`;
            response += `• Ketik "admin" untuk panel admin`;
            
            return response;
            
        } catch (error) {
            console.error('Error removing group:', error);
            return '❌ Maaf, terjadi kesalahan dalam menghapus group.';
        }
    }

    async handleListGroups() {
        try {
            const config = await this.database.loadConfig();
            const allowedGroups = config.allowedGroups || [];
            
            let response = `📋 *DAFTAR GROUP YANG DIIZINKAN*\n\n`;
            
            if (allowedGroups.length === 0) {
                response += `📝 *STATUS:* Belum ada group yang didaftarkan\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Ketik "add group [group_id]" untuk menambah group\n`;
                response += `• Contoh: "add group 123456789@g.us"\n`;
                response += `• Ketik "admin" untuk panel admin`;
            } else {
                response += `📊 *SUMMARY:*\n`;
                response += `• Total Groups: ${allowedGroups.length}\n`;
                response += `• Status: ${allowedGroups.length} group diizinkan\n\n`;
                
                response += `📝 *DAFTAR GROUP:*\n`;
                allowedGroups.forEach((groupId, index) => {
                    response += `${index + 1}. ${groupId}\n`;
                });
                
                response += `\n💡 *TIPS:*\n`;
                response += `• Ketik "remove group [group_id]" untuk menghapus\n`;
                response += `• Ketik "admin" untuk panel admin`;
            }
            
            return response;
            
        } catch (error) {
            console.error('Error listing groups:', error);
            return '❌ Maaf, terjadi kesalahan dalam menampilkan daftar group.';
        }
    }

    async generateResponse(analysis, savedRecord) {
        const emoji = analysis.type === 'income' ? '💰' : '💸';
        const typeText = analysis.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const amount = this.formatCurrency(analysis.amount);
        const date = moment().format('DD/MM/YYYY HH:mm');
        
        console.log(`📝 Response Debug:`);
        console.log(`  - Saved record author: ${savedRecord.author}`);
        console.log(`  - Analysis:`, analysis);
        
        let response = `${emoji} *${typeText} Tercatat!*\n\n`;
        response += `📊 *Detail Transaksi:*\n`;
        response += `• Jumlah: Rp ${amount}\n`;
        response += `• Kategori: ${analysis.category}\n`;
        response += `• Deskripsi: ${analysis.description}\n`;
        response += `• Tanggal: ${date}\n`;
        response += `• Oleh: ${savedRecord.author}\n\n`;

        // Add summary
        const summary = await this.getSummary();
        response += `📈 *Ringkasan Keuangan:*\n`;
        response += `• Total Pemasukan: Rp ${this.formatCurrency(summary.totalIncome)}\n`;
        response += `• Total Pengeluaran: Rp ${this.formatCurrency(summary.totalExpense)}\n`;
        response += `• Saldo: Rp ${this.formatCurrency(summary.balance)}\n`;

        return response;
    }

    async getSummary() {
        try {
            const transactions = await this.database.getTransactions();
            console.log("🔍 Transactions:", transactions);
            const incomeTransactions = transactions.filter(t => t.type === 'income');
            const expenseTransactions = transactions.filter(t => t.type === 'expense');

            const summary = transactions.reduce((acc, transaction) => {
                if (transaction.type === 'income') {
                    acc.totalIncome += transaction.amount;
                } else {
                    acc.totalExpense += transaction.amount;
                }
                return acc;
            }, { totalIncome: 0, totalExpense: 0 });

            summary.balance = summary.totalIncome - summary.totalExpense;
            summary.incomeCount = incomeTransactions.length;
            summary.expenseCount = expenseTransactions.length;  
            summary.transactionCount = incomeTransactions.length + expenseTransactions.length;
            console.log("🔍 Summary:", summary);
            return summary;
        } catch (error) {
            console.error('Error getting summary:', error);
            return { totalIncome: 0, totalExpense: 0, balance: 0 };
        }
    }

    async getSummaryByDate(startDate, endDate) {
        try {
            const transactions = await this.database.getTransactions();
            
            // Filter transactions by date range with proper time boundaries
            const filteredTransactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.timestamp);
                
                // Create start and end dates in local timezone
                const startDateLocal = new Date(startDate + 'T00:00:00');
                const endDateLocal = new Date(endDate + 'T23:59:59.999');
                
                // Compare dates in local timezone
                const transactionDateLocal = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
                const startDateLocalOnly = new Date(startDateLocal.getFullYear(), startDateLocal.getMonth(), startDateLocal.getDate());
                const endDateLocalOnly = new Date(endDateLocal.getFullYear(), endDateLocal.getMonth(), endDateLocal.getDate());
                
                console.log(`🔍 Summary filtering: ${transactionDate.toISOString()} (${transactionDateLocal.toISOString()}) between ${startDateLocalOnly.toISOString()} and ${endDateLocalOnly.toISOString()}`);
                
                return transactionDateLocal >= startDateLocalOnly && transactionDateLocal <= endDateLocalOnly;
            });

            const summary = filteredTransactions.reduce((acc, transaction) => {
                if (transaction.type === 'income') {
                    acc.totalIncome += transaction.amount;
                } else {
                    acc.totalExpense += transaction.amount;
                }
                return acc;
            }, { totalIncome: 0, totalExpense: 0 });

            summary.balance = summary.totalIncome - summary.totalExpense;
            summary.startDate = startDate;
            summary.endDate = endDate;
            summary.transactionCount = filteredTransactions.length;
            
            return summary;
        } catch (error) {
            console.error('Error getting summary by date:', error);
            return { totalIncome: 0, totalExpense: 0, balance: 0, startDate, endDate, transactionCount: 0 };
        }
    }

    async getDetailByDate(startDate, endDate) {
        try {
            const transactions = await this.database.getTransactions();
            
            // Filter transactions by date range with proper time boundaries
            const filteredTransactions = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.timestamp);
                
                // Create start and end dates in local timezone
                const startDateLocal = new Date(startDate + 'T00:00:00');
                const endDateLocal = new Date(endDate + 'T23:59:59.999');
                
                // Compare dates in local timezone
                const transactionDateLocal = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
                const startDateLocalOnly = new Date(startDateLocal.getFullYear(), startDateLocal.getMonth(), startDateLocal.getDate());
                const endDateLocalOnly = new Date(endDateLocal.getFullYear(), endDateLocal.getMonth(), endDateLocal.getDate());
                
                console.log(`🔍 Filtering: ${transactionDate.toISOString()} (${transactionDateLocal.toISOString()}) between ${startDateLocalOnly.toISOString()} and ${endDateLocalOnly.toISOString()}`);
                
                return transactionDateLocal >= startDateLocalOnly && transactionDateLocal <= endDateLocalOnly;
            });

            // Group by type (income/expense)
            const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
            const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');

            // Group by category
            const incomeByCategory = this.groupByCategory(incomeTransactions);
            const expenseByCategory = this.groupByCategory(expenseTransactions);

            return {
                period: {
                    startDate: startDate,
                    endDate: endDate,
                    totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
                },
                summary: {
                    totalIncome: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
                    totalExpense: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
                    transactionCount: incomeTransactions.length + expenseTransactions.length,
                    incomeCount: incomeTransactions.length,
                    expenseCount: expenseTransactions.length
                },
                income: {
                    transactions: incomeTransactions,
                    byCategory: incomeByCategory
                },
                expense: {
                    transactions: expenseTransactions,
                    byCategory: expenseByCategory
                }
            };
        } catch (error) {
            console.error('Error getting detail by date:', error);
            return {
                period: { startDate, endDate, totalDays: 0 },
                summary: { totalIncome: 0, totalExpense: 0, transactionCount: 0, incomeCount: 0, expenseCount: 0 },
                income: { transactions: [], byCategory: {} },
                expense: { transactions: [], byCategory: {} }
            };
        }
    }

    groupByCategory(transactions) {
        return transactions.reduce((acc, transaction) => {
            const category = transaction.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            acc[category].total += transaction.amount;
            acc[category].count += 1;
            acc[category].transactions.push(transaction);
            return acc;
        }, {});
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    // AI Control Methods
    generateAIControlPanel() {
        let response = `🤖 *AI CONTROL PANEL - FINANCE BOT*\n\n`;
        response += `🔧 *KONTROL AI SERVICE:*\n`;
        response += `• "enable ai" atau "aktifkan ai" - Nyalakan AI service\n`;
        response += `• "disable ai" atau "matikan ai" - Matikan AI service\n`;
        response += `• "ai status" atau "status ai" - Cek status AI\n\n`;
        response += `🔑 *API KEY MANAGEMENT:*\n`;
        response += `• "set ai key [your_api_key]" - Set OpenAI API key\n`;
        response += `• Contoh: "set ai key sk-1234567890abcdef"\n\n`;
        response += `📊 *STATUS AI:*\n`;
        response += `• AI akan menggunakan OpenAI untuk analisis cerdas\n`;
        response += `• Jika AI dimatikan, akan menggunakan pattern matching\n`;
        response += `• Pattern matching tetap berfungsi sebagai fallback\n\n`;
        response += `💡 *TIPS:*\n`;
        response += `• Pastikan API key valid untuk menggunakan AI\n`;
        response += `• AI memberikan analisis yang lebih akurat\n`;
        response += `• Pattern matching sebagai backup jika AI error\n`;
        response += `• Ketik "ai status" untuk cek konfigurasi`;
        
        return response;
    }

    async handleEnableAI() {
        try {
            // Enable AI service
            this.aiService.enableAI();
            
            let response = `✅ *AI SERVICE AKTIF*\n\n`;
            response += `🤖 AI service telah diaktifkan\n`;
            response += `📊 Bot akan menggunakan OpenAI untuk analisis\n`;
            response += `🔍 Pattern matching tetap sebagai fallback\n\n`;
            response += `💡 *Tips:*\n`;
            response += `• Pastikan API key sudah diset\n`;
            response += `• Ketik "ai status" untuk cek konfigurasi\n`;
            response += `• Ketik "set ai key [key]" jika belum ada key`;
            
            return response;
        } catch (error) {
            console.error('Error enabling AI:', error);
            return '❌ Maaf, terjadi kesalahan saat mengaktifkan AI service.';
        }
    }

    async handleDisableAI() {
        try {
            // Disable AI service
            this.aiService.disableAI();
            
            let response = `🔄 *AI SERVICE DIMATIKAN*\n\n`;
            response += `🤖 AI service telah dimatikan\n`;
            response += `📊 Bot akan menggunakan pattern matching\n`;
            response += `🔍 Pattern matching tetap berfungsi dengan baik\n\n`;
            response += `💡 *TIPS:*\n`;
            response += `• Pattern matching mendukung banyak format\n`;
            response += `• Tetap bisa menganalisis transaksi keuangan\n`;
            response += `• Ketik "enable ai" untuk mengaktifkan kembali`;
            
            return response;
        } catch (error) {
            console.error('Error disabling AI:', error);
            return '❌ Maaf, terjadi kesalahan saat mematikan AI service.';
        }
    }

    async handleSetAIKey(message) {
        try {
            // Extract API key from message
            const keyMatch = message.match(/set ai key (.+)/i) || 
                           message.match(/ai key (.+)/i) || 
                           message.match(/set key (.+)/i);
            
            if (!keyMatch || !keyMatch[1]) {
                return `❌ *FORMAT SALAH*\n\n`;
                response += `📝 *Format yang benar:*\n`;
                response += `• "set ai key [your_api_key]"\n`;
                response += `• "ai key [your_api_key]"\n`;
                response += `• "set key [your_api_key]"\n\n`;
                response += `💡 *Contoh:*\n`;
                response += `• "set ai key sk-1234567890abcdef"\n`;
                response += `• "ai key sk-abcdef1234567890"\n\n`;
                response += `🔑 *Cara mendapatkan API key:*\n`;
                response += `• Kunjungi https://platform.openai.com\n`;
                response += `• Buat account atau login\n`;
                response += `• Buka menu API Keys\n`;
                response += `• Create new secret key`;
            }
            
            const apiKey = keyMatch[1].trim();
            
            // Validate API key format (basic validation)
            if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
                return `❌ *API KEY TIDAK VALID*\n\n`;
                response += `🔑 *Format API key yang benar:*\n`;
                response += `• Harus dimulai dengan "sk-"\n`;
                response += `• Minimal 20 karakter\n`;
                response += `• Contoh: sk-1234567890abcdef\n\n`;
                response += `💡 *Tips:*\n`;
                response += `• Pastikan copy API key dengan benar\n`;
                response += `• Jangan ada spasi di awal atau akhir\n`;
                response += `• Ketik "ai status" untuk cek key yang tersimpan`;
            }
            
            // Set API key
            this.aiService.setAPIKey(apiKey);
            
            let response = `✅ *API KEY BERHASIL DISET*\n\n`;
            response += `🔑 API key telah disimpan\n`;
            response += `🤖 AI service siap digunakan\n`;
            response += `📊 Bot akan menggunakan OpenAI untuk analisis\n\n`;
            response += `💡 *Tips:*\n`;
            response += `• Ketik "enable ai" untuk mengaktifkan AI\n`;
            response += `• Ketik "ai status" untuk cek konfigurasi\n`;
            response += `• Ketik "disable ai" jika ingin matikan AI`;
            
            return response;
        } catch (error) {
            console.error('Error setting AI key:', error);
            return '❌ Maaf, terjadi kesalahan saat menyimpan API key.';
        }
    }

    async handleAICheckStatus() {
        try {
            const status = this.aiService.getStatus();
            
            let response = `🤖 *AI SERVICE STATUS*\n\n`;
            response += `📊 *Status AI:* ${status.isEnabled ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n`;
            response += `🔑 *API Key:* ${status.hasAPIKey ? '✅ TERSEDIA' : '❌ BELUM DISET'}\n`;
            response += `🔍 *Pattern Matching:* ✅ SELALU AKTIF\n\n`;
            
            if (status.isEnabled && status.hasAPIKey) {
                response += `✅ *AI SERVICE SIAP*\n`;
                response += `• OpenAI akan digunakan untuk analisis\n`;
                response += `• Pattern matching sebagai fallback\n`;
            } else if (status.hasAPIKey && !status.isEnabled) {
                response += `🔄 *AI TERSEDIA TAPI DIMATIKAN*\n`;
                response += `• API key sudah diset\n`;
                response += `• Ketik "enable ai" untuk mengaktifkan\n`;
            } else if (!status.hasAPIKey) {
                response += `🔑 *API KEY BELUM DISET*\n`;
                response += `• Ketik "set ai key [key]" untuk set API key\n`;
                response += `• Pattern matching tetap berfungsi\n`;
            }
            
            response += `\n💡 *Tips:*\n`;
            response += `• Pattern matching selalu aktif sebagai backup\n`;
            response += `• AI memberikan analisis yang lebih akurat\n`;
            response += `• Ketik "ai" untuk menu kontrol AI`;
            
            return response;
        } catch (error) {
            console.error('Error checking AI status:', error);
            return '❌ Maaf, terjadi kesalahan saat mengecek status AI.';
        }
    }

    // Backup & Restore Methods
    async handleManualBackup() {
        try {
            console.log('🔄 Creating manual backup...');
            
            const backupResult = await this.backupService.createBackup();
            
            if (!backupResult.success) {
                return `❌ *BACKUP GAGAL*\n\nError: ${backupResult.error}`;
            }

            const metadata = backupResult.metadata;
            let response = `✅ *BACKUP BERHASIL DIBUAT*\n\n`;
            response += `📦 *File:* ${backupResult.fileName}\n`;
            response += `📅 *Tanggal:* ${new Date().toLocaleString('id-ID')}\n\n`;
            response += `📊 *Data Summary:*\n`;
            response += `• Total Transaksi: ${metadata.totalTransactions}\n`;
            response += `• Total Pemasukan: Rp ${this.formatCurrency(metadata.totalIncome)}\n`;
            response += `• Total Pengeluaran: Rp ${this.formatCurrency(metadata.totalExpense)}\n\n`;
            response += `💡 *Tips:*\n`;
            response += `• File backup tersimpan di server\n`;
            response += `• Ketik "backup list" untuk melihat daftar backup\n`;
            response += `• Ketik "restore" untuk memulihkan data`;

            return response;

        } catch (error) {
            console.error('Error creating manual backup:', error);
            return '❌ Maaf, terjadi kesalahan saat membuat backup.';
        }
    }

    async handleBackupList() {
        try {
            const backupList = await this.backupService.getBackupList();
            
            if (backupList.length === 0) {
                return `📦 *DAFTAR BACKUP*\n\nBelum ada file backup yang tersimpan.\n\n💡 *Tips:*\n• Ketik "backup" untuk membuat backup manual`;
            }

            let response = `📦 *DAFTAR BACKUP*\n\n`;
            
            backupList.slice(0, 10).forEach((backup, index) => {
                const date = new Date(backup.created).toLocaleString('id-ID');
                response += `${index + 1}. *${backup.fileName}*\n`;
                response += `   📅 ${date}\n`;
                response += `   📏 ${backup.sizeFormatted}\n\n`;
            });

            if (backupList.length > 10) {
                response += `... dan ${backupList.length - 10} file lainnya\n\n`;
            }

            response += `💡 *Tips:*\n`;
            response += `• Total ${backupList.length} file backup\n`;
            response += `• File terbaru di atas\n`;
            response += `• Ketik "restore" untuk memulihkan data`;

            return response;

        } catch (error) {
            console.error('Error getting backup list:', error);
            return '❌ Maaf, terjadi kesalahan saat mengambil daftar backup.';
        }
    }

    async handleBackupSchedule() {
        try {
            if (!this.scheduledBackupService) {
                return '❌ *ERROR:* Scheduled backup service tidak tersedia.';
            }
            const schedules = this.scheduledBackupService.getSchedules();
            
            let response = `🕐 *JADWAL BACKUP OTOMATIS*\n\n`;
            
            schedules.forEach(schedule => {
                const status = schedule.targetGroup ? '🟢 AKTIF' : '🔴 NONAKTIF';
                const nextRun = schedule.nextRun ? new Date(schedule.nextRun).toLocaleString('id-ID') : 'Tidak dijadwalkan';
                const targetGroup = schedule.targetGroup ? '✅ Set' : '❌ Belum set';
                
                response += `📅 *${schedule.name}*\n`;
                response += `• Status: ${status}\n`;
                response += `• Jadwal: ${schedule.schedule}\n`;
                response += `• Next Run: ${nextRun}\n`;
                response += `• Target Group: ${targetGroup}\n\n`;
            });

            response += `💡 *Tips:*\n`;
            response += `• Backup otomatis akan dikirim ke group\n`;
            response += `• Set target group untuk mengaktifkan\n`;
            response += `• File backup akan terlampir otomatis`;

            return response;

        } catch (error) {
            console.error('Error getting backup schedule:', error);
            return '❌ Maaf, terjadi kesalahan saat mengambil jadwal backup.';
        }
    }

    async handleRestoreBackup() {
        try {
            let response = `🔄 *RESTORE BACKUP*\n\n`;
            response += `📝 *Cara Restore:*\n`;
            response += `1. Kirim file backup (.zip) ke chat ini\n`;
            response += `2. Bot akan memvalidasi file backup\n`;
            response += `3. Data akan dipulihkan otomatis\n\n`;
            response += `⚠️ *PERINGATAN:*\n`;
            response += `• Data saat ini akan dihapus\n`;
            response += `• Pastikan backup file valid\n`;
            response += `• Proses tidak dapat dibatalkan\n\n`;
            response += `💡 *Tips:*\n`;
            response += `• Ketik "backup list" untuk melihat daftar backup\n`;
            response += `• File backup harus berformat .zip\n`;
            response += `• Tunggu konfirmasi sebelum restore`;
            return response;

        } catch (error) {
            console.error('Error handling restore backup:', error);
            return '❌ Maaf, terjadi kesalahan saat memproses restore backup.';
        }
    }

    async handleRestoreConfirm() {
        try {
            // This will be handled by the server
            return '🔄 *RESTORE CONFIRMED*\n\nProses restore sedang berjalan...\n\n⚠️ *PERINGATAN:*\n• Data saat ini akan dihapus\n• Proses tidak dapat dibatalkan\n• Tunggu konfirmasi selesai';
        } catch (error) {
            console.error('Error handling restore confirm:', error);
            return '❌ Maaf, terjadi kesalahan saat memproses restore confirm.';
        }
    }

    async handleRestoreCancel() {
        try {
            // This will be handled by the server
            return '❌ *RESTORE DIBATALKAN*\n\nProses restore telah dibatalkan.\n\n💡 *Tips:*\n• File backup tetap tersimpan\n• Ketik "restore" untuk mencoba lagi\n• Ketik "backup list" untuk melihat daftar backup';
        } catch (error) {
            console.error('Error handling restore cancel:', error);
            return '❌ Maaf, terjadi kesalahan saat memproses restore cancel.';
        }
    }

    async handleDownloadBackup(message) {
        try {
            // Extract backup file name from message
            const parts = message.split(' ');
            let fileName = null;
            
            // Find backup file name in the message
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].includes('.zip')) {
                    fileName = parts[i];
                    break;
                }
            }
            
            if (!fileName) {
                let response = `❌ *ERROR:* Nama file backup tidak ditemukan!\n\n`;
                response += `📝 *CARA PENGGUNAAN:*\n`;
                response += `• Ketik: "download backup [nama_file.zip]"\n`;
                response += `• Contoh: "download backup finance-backup-2025-01-28T10-30-00-000Z.zip"\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Ketik "backup list" untuk melihat daftar backup\n`;
                response += `• File backup harus berformat .zip\n`;
                response += `• Bot akan mengirim file backup ke chat`;
                return response;
            }
            
            // Check if file exists
            const backupList = await this.backupService.getBackupList();
            const backupFile = backupList.find(backup => backup.fileName === fileName);
            
            if (!backupFile) {
                let response = `❌ *ERROR:* File backup "${fileName}" tidak ditemukan!\n\n`;
                response += `📝 *DAFTAR BACKUP YANG TERSEDIA:*\n`;
                backupList.slice(0, 5).forEach((backup, index) => {
                    response += `${index + 1}. ${backup.fileName}\n`;
                });
                response += `\n💡 *TIPS:*\n`;
                response += `• Ketik "backup list" untuk daftar lengkap\n`;
                response += `• Pastikan nama file benar\n`;
                response += `• File backup harus ada di server`;
                return response;
            }
            
            // Return success message with file info for server to send
            let response = `✅ *DOWNLOAD BACKUP*\n\n`;
            response += `📦 *File:* ${fileName}\n`;
            response += `📅 *Created:* ${new Date(backupFile.created).toLocaleString('id-ID')}\n`;
            response += `📏 *Size:* ${backupFile.sizeFormatted}\n\n`;
            response += `📤 *Status:* File sedang dikirim...\n\n`;
            response += `💡 *TIPS:*\n`;
            response += `• File backup akan dikirim ke chat ini\n`;
            response += `• Simpan file untuk restore nanti\n`;
            response += `• File berformat .zip\n\n`;
            response += `🔧 *File Info:* ${backupFile.filePath}`;
            return response;

        } catch (error) {
            console.error('Error handling download backup:', error);
            return '❌ Maaf, terjadi kesalahan saat memproses download backup.';
        }
    }

    async handleSendBackupFile(message) {
        try {
            // Extract backup file name from message
            const parts = message.split(' ');
            let fileName = null;
            
            // Find backup file name in the message
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].includes('.zip')) {
                    fileName = parts[i];
                    break;
                }
            }
            
            if (!fileName) {
                let response = `❌ *ERROR:* Nama file backup tidak ditemukan!\n\n`;
                response += `📝 *CARA PENGGUNAAN:*\n`;
                response += `• Ketik: "send backup [nama_file.zip]"\n`;
                response += `• Contoh: "send backup finance-backup-2025-01-28T10-30-00-000Z.zip"\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Ketik "backup list" untuk melihat daftar backup\n`;
                response += `• File backup harus berformat .zip\n`;
                response += `• Bot akan mengirim file backup ke chat`;
                return response;
            }
            
            // Check if file exists
            const backupList = await this.backupService.getBackupList();
            const backupFile = backupList.find(backup => backup.fileName === fileName);
            
            if (!backupFile) {
                let response = `❌ *ERROR:* File backup "${fileName}" tidak ditemukan!\n\n`;
                response += `📝 *DAFTAR BACKUP YANG TERSEDIA:*\n`;
                backupList.slice(0, 5).forEach((backup, index) => {
                    response += `${index + 1}. ${backup.fileName}\n`;
                });
                response += `\n💡 *TIPS:*\n`;
                response += `• Ketik "backup list" untuk daftar lengkap\n`;
                response += `• Pastikan nama file benar\n`;
                response += `• File backup harus ada di server`;
                return response;
            }
            
            // Return file info for server to send
            let response = `📤 *SEND BACKUP FILE*\n\n`;
            response += `📦 *File:* ${fileName}\n`;
            response += `📅 *Created:* ${new Date(backupFile.created).toLocaleString('id-ID')}\n`;
            response += `📏 *Size:* ${backupFile.sizeFormatted}\n`;
            response += `📁 *Path:* ${backupFile.filePath}\n\n`;
            response += `📤 *Status:* File sedang dikirim...\n\n`;
            response += `💡 *TIPS:*\n`;
            response += `• File backup akan dikirim ke chat ini\n`;
            response += `• Simpan file untuk restore nanti\n`;
            response += `• File berformat .zip`;

            return response;

        } catch (error) {
            console.error('Error handling send backup file:', error);
            return '❌ Maaf, terjadi kesalahan saat memproses send backup file.';
        }
    }

    async handleSetBackupGroup(message) {
        try {
            if (!this.scheduledBackupService) {
                return '❌ *ERROR:* Scheduled backup service tidak tersedia.';
            }
            // Extract group ID from message
            const parts = message.split(' ');
            let groupId = null;
            let scheduleId = 'daily'; // Default to daily
            
            // Find group ID and schedule type in the message
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].includes('@g.us')) {
                    groupId = parts[i];
                }
                if (parts[i] === 'daily' || parts[i] === 'weekly' || parts[i] === 'monthly') {
                    scheduleId = parts[i];
                }
            }
            
            if (!groupId) {
                let response = `❌ *ERROR:* Group ID tidak ditemukan!\n\n`;
                response += `📝 *CARA PENGGUNAAN:*\n`;
                response += `• Ketik: "set backup group [group_id] [schedule]"\n`;
                response += `• Contoh: "set backup group 123456789@g.us daily"\n`;
                response += `• Schedule: daily, weekly, monthly\n\n`;
                response += `💡 *TIPS:*\n`;
                response += `• Group ID harus berformat: [number]@g.us\n`;
                response += `• Backup akan dikirim ke group secara otomatis\n`;
                response += `• File backup akan terlampir otomatis`;
                return response;
            }
            
            // Validate group ID format
            if (!groupId.match(/^\d+@g\.us$/)) {
                let response = `❌ *ERROR:* Format Group ID tidak valid!\n\n`;
                response += `📝 *FORMAT YANG BENAR:*\n`;
                response += `• Contoh: 123456789@g.us\n`;
                response += `• Harus berakhir dengan @g.us\n`;
                response += `• Hanya angka sebelum @g.us`;
                return response;
            }
            
            // Set target group for scheduled backup
            const result = this.scheduledBackupService.setTargetGroup(scheduleId, groupId);
            
            if (result.success) {
                let response = `✅ *BACKUP GROUP SET*\n\n`;
                response += `📦 *Schedule:* ${scheduleId.toUpperCase()}\n`;
                response += `👥 *Target Group:* ${groupId}\n`;
                response += `📅 *Status:* Backup otomatis aktif\n\n`;
                response += `💡 *INFO:*\n`;
                response += `• Backup akan dikirim ke group secara otomatis\n`;
                response += `• File backup akan terlampir otomatis\n`;
                response += `• Ketik "backup schedule" untuk cek jadwal`;
                return response;
            } else {
                return `❌ *ERROR:* ${result.error}`;
            }

        } catch (error) {
            console.error('Error handling set backup group:', error);
            return '❌ Maaf, terjadi kesalahan saat mengatur backup group.';
        }
    }

    async handleBackupGroupStatus() {
        try {
            if (!this.scheduledBackupService) {
                return '❌ *ERROR:* Scheduled backup service tidak tersedia.';
            }
            const schedules = this.scheduledBackupService.getSchedules();
            
            let response = `📦 *BACKUP GROUP STATUS*\n\n`;
            
            schedules.forEach(schedule => {
                const status = schedule.targetGroup ? '✅ AKTIF' : '❌ NONAKTIF';
                const targetGroup = schedule.targetGroup || 'Belum diset';
                const nextRun = schedule.nextRun ? new Date(schedule.nextRun).toLocaleString('id-ID') : 'Tidak dijadwalkan';
                
                response += `📅 *${schedule.name}*\n`;
                response += `• Status: ${status}\n`;
                response += `• Target Group: ${targetGroup}\n`;
                response += `• Next Run: ${nextRun}\n\n`;
            });

            response += `💡 *TIPS:*\n`;
            response += `• Ketik "set backup group [group_id] [schedule]" untuk mengatur\n`;
            response += `• Schedule: daily, weekly, monthly\n`;
            response += `• File backup akan dikirim otomatis ke group`;

            return response;

        } catch (error) {
            console.error('Error handling backup group status:', error);
            return '❌ Maaf, terjadi kesalahan saat mengecek status backup group.';
        }
    }
}

module.exports = FinanceBot; 