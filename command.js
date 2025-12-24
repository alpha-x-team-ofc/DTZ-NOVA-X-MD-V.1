var commands = [];

function cmd(info, func) {
    // Validate required parameters
    if (!info || typeof info !== 'object') {
        throw new Error('Command info must be an object');
    }
    
    if (!info.pattern || typeof info.pattern !== 'string') {
        throw new Error('Command pattern is required and must be a string');
    }
    
    if (!func || typeof func !== 'function') {
        throw new Error('Command function is required');
    }
    
    var data = {
        ...info,
        function: func
    };
    
    // Set default values
    data.dontAddCommandList = info.dontAddCommandList || false;
    data.desc = info.desc || '';
    data.fromMe = info.fromMe || false;
    data.category = info.category || 'misc';
    data.filename = info.filename || 'Not Provided';
    data.alias = info.alias || [];
    data.usage = info.usage || '';
    data.react = info.react || '';
    data.on = info.on || 'text'; // default trigger type
    
    // Add to commands array
    commands.push(data);
    
    // Log for debugging (optional)
    console.log(`✓ Command loaded: ${data.pattern} (${data.filename})`);
    
    return data;
}

// Helper function to find command by pattern or alias
function findCommand(input) {
    const cmd = input.toLowerCase().trim();
    return commands.find(command => 
        command.pattern.toLowerCase() === cmd || 
        (command.alias && command.alias.includes(cmd))
    );
}

// Helper function to get commands by category
function getCommandsByCategory(category) {
    return commands.filter(cmd => cmd.category === category);
}

// Helper function to get all categories
function getAllCategories() {
    const categories = new Set(commands.map(cmd => cmd.category));
    return Array.from(categories);
}

module.exports = {
    cmd,
    AddCommand: cmd,
    Function: cmd,
    Module: cmd,
    commands,
    findCommand,
    getCommandsByCategory,
    getAllCategories
};
