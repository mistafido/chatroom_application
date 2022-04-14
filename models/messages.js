
const mongoose = require('mongoose');
const msgSchema = new mongoose.Schema({
    msg: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    room: {
        type: String,
        required: true 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
})

const Msg = mongoose.model('msg', msgSchema);
module.exports = Msg;