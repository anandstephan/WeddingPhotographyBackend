import mongoose from "mongoose";


const shareEventSchema =  new mongoose.Schema(
    {
        eventId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Event',
        }
        ,
        mobile : {
            type: String,
            required : false,
        },

    }
)

export const EventShare  =  mongoose.model('EventShare',shareEventSchema);

