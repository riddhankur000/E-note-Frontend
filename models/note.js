import mongoose from 'mongoose';



  const noteschema = new mongoose.Schema({
    index: Number,
    heading: String,
    text: String
  });

  const userschema = new mongoose.Schema({
    id: Number,
    username: String,
    email: String,
    password: String,
    darkmode: Boolean,
    notes: [noteschema]
})



// module.exports = student = mongoose.model('student', stdschema);

export default mongoose.model('userschema',userschema);

  