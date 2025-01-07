import mongoose from "mongoose";


const shareEventSchema =  new mongoose.Schema(
    {
        eventId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Event',
        }
        ,
        sharedMobile : {
            type: String,
            required : false,
        },
       
        
    }
)

export const shareEvent  =  mongoose.model('Share',shareEventSchema);

