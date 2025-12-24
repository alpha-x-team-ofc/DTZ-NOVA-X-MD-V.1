const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

/**
 * Get buffer from URL with improved error handling
 */
const getBuffer = async (url, options = {}) => {
    try {
        const defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            ...options.headers
        };

        const res = await axios({
            method: 'GET',
            url,
            headers: defaultHeaders,
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            ...options
        });

        // Validate the response
        if (!res.data || res.data.length === 0) {
            throw new Error('Empty response from server');
        }

        // Check content type if needed
        const contentType = res.headers['content-type'];
        if (options.expectedType && contentType && !contentType.includes(options.expectedType)) {
            throw new Error(`Expected ${options.expectedType} but got ${contentType}`);
        }

        return res.data;

    } catch (error) {
        console.error('getBuffer Error:', {
            url: url.substring(0, 100) + '...',
            status: error.response?.status,
            message: error.message
        });
        
        // Return null instead of throwing to prevent bot crashes
        return null;
    }
};

/**
 * Get buffer from local file
 */
const getBufferFromFile = async (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFileSync(filePath);
    } catch (error) {
        console.error('getBufferFromFile Error:', error.message);
        return null;
    }
};

/**
 * Save buffer to file
 */
const saveBufferToFile = async (buffer, filePath) => {
    try {
        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);
        await fs.writeFile(filePath, buffer);
        return filePath;
    } catch (error) {
        console.error('saveBufferToFile Error:', error.message);
        return null;
    }
};

/**
 * Get group admins with improved validation
 */
const getGroupAdmins = (participants) => {
    try {
        if (!Array.isArray(participants)) {
            return [];
        }
        
        return participants
            .filter(participant => 
                participant && 
                participant.admin && 
                (participant.admin === 'admin' || participant.admin === 'superadmin')
            )
            .map(participant => participant.id)
            .filter(id => id && id.includes('@'));
    } catch (error) {
        console.error('getGroupAdmins Error:', error.message);
        return [];
    }
};

/**
 * Generate random string with extension
 */
const getRandom = (ext = '') => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}_${random}${ext.startsWith('.') ? ext : '.' + ext}`;
};

/**
 * Format number to human readable (K, M, B, T)
 */
const h2k = (number) => {
    try {
        const num = Number(number);
        if (isNaN(num)) return '0';
        
        const units = ['', 'K', 'M', 'B', 'T'];
        const sign = num < 0 ? '-' : '';
        const absNum = Math.abs(num);
        
        if (absNum < 1000) return sign + absNum.toString();
        
        const exp = Math.min(
            Math.floor(Math.log10(absNum) / 3),
            units.length - 1
        );
        
        const scaled = absNum / Math.pow(1000, exp);
        const formatted = scaled.toFixed(1).replace(/\.0$/, '');
        
        return sign + formatted + units[exp];
    } catch (error) {
        return number.toString();
    }
};

/**
 * Validate URL with improved regex
 */
const isUrl = (string) => {
    try {
        if (typeof string !== 'string') return false;
        
        const urlPattern = new RegExp(
            '^(https?:\\/\\/)?' + // protocol
            '((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+' + // domain name
            '[a-zA-Z]{2,}|' + // OR ip (v4) address
            '((\\d{1,3}\\.){3}\\d{1,3})|' + // OR localhost
            'localhost)' +
            '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-zA-Z_\\d]*)?$', 'i' // fragment locator
        );
        
        return urlPattern.test(string.trim());
    } catch (error) {
        return false;
    }
};

/**
 * Validate and parse URL
 */
const parseUrl = (url) => {
    try {
        if (!isUrl(url)) return null;
        return new URL(url);
    } catch (error) {
        return null;
    }
};

/**
 * Pretty JSON stringify
 */
const Json = (data, space = 2) => {
    try {
        return JSON.stringify(data, null, space);
    } catch (error) {
        return '{}';
    }
};

/**
 * Format runtime (seconds to human readable)
 */
const runtime = (seconds) => {
    try {
        seconds = Number(seconds);
        if (isNaN(seconds) || seconds < 0) return '0 seconds';
        
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
        
        // Join with commas, with "and" before last part
        if (parts.length > 1) {
            const last = parts.pop();
            return parts.join(', ') + ' and ' + last;
        }
        
        return parts[0];
    } catch (error) {
        return `${seconds} seconds`;
    }
};

/**
 * Sleep/delay function
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Fetch JSON with improved error handling
 */
const fetchJson = async (url, options = {}) => {
    try {
        const defaultOptions = {
            method: 'GET',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                ...options.headers
            },
            ...options
        };

        const response = await axios(url, defaultOptions);
        
        // Validate response
        if (!response.data) {
            throw new Error('Empty response');
        }
        
        // If response is string, try to parse as JSON
        if (typeof response.data === 'string') {
            return JSON.parse(response.data);
        }
        
        return response.data;
        
    } catch (error) {
        console.error('fetchJson Error:', {
            url: url.substring(0, 100),
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message
        });
        
        // Return error object instead of throwing
        return {
            error: true,
            status: error.response?.status || 500,
            message: error.message || 'Network error',
            data: null
        };
    }
};

/**
 * Format bytes to human readable size
 */
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generate random HEX color
 */
const randomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

/**
 * Escape regex special characters
 */
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validate phone number format
 */
const isValidPhoneNumber = (number) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(number.replace(/[\s\-\(\)\.]/g, ''));
};

/**
 * Format phone number to WhatsApp JID
 */
const formatJid = (number) => {
    if (!number) return null;
    
    // Remove all non-numeric characters
    const cleanNumber = number.replace(/\D/g, '');
    
    // Check if number already has country code
    if (cleanNumber.startsWith('0')) {
        // Assuming default country code is 94 (Sri Lanka)
        // You might want to make this configurable
        return '94' + cleanNumber.substring(1) + '@s.whatsapp.net';
    }
    
    // If it already looks like a full number
    if (cleanNumber.length >= 10) {
        return cleanNumber + '@s.whatsapp.net';
    }
    
    return null;
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        console.error('deepClone Error:', error.message);
        return {};
    }
};

/**
 * Debounce function for limiting rapid calls
 */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

module.exports = {
    getBuffer,
    getBufferFromFile,
    saveBufferToFile,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    parseUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    formatBytes,
    randomColor,
    escapeRegex,
    isValidPhoneNumber,
    formatJid,
    deepClone,
    debounce
};
