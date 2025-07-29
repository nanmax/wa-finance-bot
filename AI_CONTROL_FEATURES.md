# 🤖 AI Control Features

## 🎯 **Fitur Kontrol AI Service**

### **Overview**
Fitur ini memungkinkan pengguna untuk mengontrol AI service (OpenAI) melalui chatbot, termasuk:
- Menyalakan/mematikan AI service
- Set API key OpenAI
- Cek status AI service
- Fallback ke pattern matching

## 📋 **Commands yang Tersedia**

### **1. AI Control Panel**
```
User: ai
User: ai control
User: control ai
User: ai panel
```
**Response:** Menampilkan panel kontrol AI dengan semua opsi yang tersedia

### **2. Enable AI Service**
```
User: enable ai
User: aktifkan ai
User: nyalakan ai
User: ai on
```
**Response:** Mengaktifkan AI service untuk menggunakan OpenAI

### **3. Disable AI Service**
```
User: disable ai
User: nonaktifkan ai
User: matikan ai
User: ai off
```
**Response:** Mematikan AI service, menggunakan pattern matching

### **4. Set AI API Key**
```
User: set ai key sk-1234567890abcdef
User: ai key sk-abcdef1234567890
User: set key sk-1234567890abcdef
```
**Response:** Menyimpan API key OpenAI untuk penggunaan AI

### **5. Check AI Status**
```
User: ai status
User: status ai
User: cek ai
User: ai info
```
**Response:** Menampilkan status AI service dan konfigurasi

## 🔧 **Implementasi Technical**

### **1. FinanceBot.js Changes**
```javascript
// Added to handleReportCommands()
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
```

### **2. AIService.js Changes**
```javascript
// Added properties
this.isEnabled = true; // Default enabled
this.apiKey = process.env.OPENAI_API_KEY || null;

// Modified analyzeFinanceMessage()
if (this.isEnabled && this.openai) {
    const aiAnalysis = await this.analyzeWithAI(message);
    if (aiAnalysis) {
        return aiAnalysis;
    }
}

// Added AI Control Methods
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
```

## 📊 **Status AI Service**

### **Status yang Tersedia:**
1. **🟢 AKTIF** - AI service aktif dan siap digunakan
2. **🔴 NONAKTIF** - AI service dimatikan, menggunakan pattern matching
3. **✅ TERSEDIA** - API key sudah diset
4. **❌ BELUM DISET** - API key belum diset

### **Kombinasi Status:**
- **AI AKTIF + API KEY TERSEDIA** = OpenAI akan digunakan
- **AI NONAKTIF + API KEY TERSEDIA** = Pattern matching digunakan
- **AI AKTIF + API KEY BELUM DISET** = Pattern matching digunakan
- **AI NONAKTIF + API KEY BELUM DISET** = Pattern matching digunakan

## 🔍 **Validation & Error Handling**

### **1. API Key Validation**
```javascript
// Basic validation
if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
    return '❌ API KEY TIDAK VALID';
}
```

### **2. Format Validation**
```javascript
// Extract API key from message
const keyMatch = message.match(/set ai key (.+)/i) || 
               message.match(/ai key (.+)/i) || 
               message.match(/set key (.+)/i);
```

### **3. Error Handling**
- Try-catch untuk semua AI operations
- Fallback ke pattern matching jika AI error
- Informative error messages untuk user

## 💡 **User Experience**

### **1. Help Integration**
```javascript
// Added to generateHelpMessage()
🤖 *AI CONTROL:*
• "ai" atau "ai control" - Panel kontrol AI
• "enable ai" atau "aktifkan ai" - Nyalakan AI
• "disable ai" atau "matikan ai" - Matikan AI
• "set ai key [key]" - Set API key AI
• "ai status" atau "status ai" - Cek status AI
```

### **2. Tips & Guidance**
- Clear instructions untuk setiap command
- Examples untuk API key format
- Links ke OpenAI platform
- Tips untuk troubleshooting

### **3. Status Feedback**
- Real-time status updates
- Clear indication of current mode
- Suggestions for next steps

## 🚀 **Usage Examples**

### **Example 1: Setup AI Service**
```
User: ai
Bot: 🤖 AI CONTROL PANEL - FINANCE BOT
     🔧 KONTROL AI SERVICE:
     • "enable ai" atau "aktifkan ai" - Nyalakan AI service
     • "disable ai" atau "matikan ai" - Matikan AI service
     • "ai status" atau "status ai" - Cek status AI
     ...

User: set ai key sk-1234567890abcdef
Bot: ✅ API KEY BERHASIL DISET
     🔑 API key telah disimpan
     🤖 AI service siap digunakan
     ...

User: enable ai
Bot: ✅ AI SERVICE AKTIF
     🤖 AI service telah diaktifkan
     📊 Bot akan menggunakan OpenAI untuk analisis
     ...
```

### **Example 2: Check Status**
```
User: ai status
Bot: 🤖 AI SERVICE STATUS
     📊 Status AI: 🟢 AKTIF
     🔑 API Key: ✅ TERSEDIA
     🔍 Pattern Matching: ✅ SELALU AKTIF
     ...
```

### **Example 3: Disable AI**
```
User: disable ai
Bot: 🔄 AI SERVICE DIMATIKAN
     🤖 AI service telah dimatikan
     📊 Bot akan menggunakan pattern matching
     ...
```

## 🔄 **Fallback Mechanism**

### **Pattern Matching Always Active**
- Pattern matching tetap berfungsi sebagai fallback
- Tidak ada downtime saat AI error
- Support untuk berbagai format transaksi
- Modern pattern matching dengan slang Indonesia

### **Graceful Degradation**
1. **AI Active + Valid Key** → OpenAI analysis
2. **AI Active + Invalid Key** → Pattern matching
3. **AI Disabled** → Pattern matching
4. **AI Error** → Pattern matching

## 💡 **Tips untuk User**

### **Untuk Setup AI:**
1. **Dapatkan API key** dari https://platform.openai.com
2. **Set API key** dengan command "set ai key [key]"
3. **Enable AI** dengan command "enable ai"
4. **Test** dengan transaksi keuangan

### **Untuk Troubleshooting:**
1. **Cek status** dengan "ai status"
2. **Validasi API key** format
3. **Restart AI** dengan disable/enable
4. **Fallback** ke pattern matching jika perlu

### **Untuk Optimal Usage:**
1. **Gunakan AI** untuk analisis yang lebih akurat
2. **Pattern matching** sebagai backup
3. **Monitor status** secara berkala
4. **Update API key** jika expired

---

**💡 Tips:** Fitur AI control memberikan fleksibilitas penuh untuk mengontrol AI service sesuai kebutuhan, dengan pattern matching sebagai fallback yang reliable! 