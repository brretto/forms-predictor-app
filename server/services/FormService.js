const FormModel = require('../db/Form')
const UserModel = require('../db/User')
const ResponseModel = require('../db/Response')
const jwt = require('jsonwebtoken');
const jwtDecode = require('jwt-decode');
const axios = require('axios');

// Helper function to map question text to model features
function mapDataToPayload(questions, answers) {
    const payload = {};

    // Find answer for a given question text
    const getAnswer = (qText) => {
        const question = questions.find(q => q.questionText.toLowerCase().includes(qText));
        if (!question) return null;

        // This assumes the response structure you had in your project.
        // It looks for an answer object matching the question's _id.
        // **This is a critical assumption**
        // We are also assuming the answer is in `optionId` even for text fields.
        // If your response model is different, this needs to change.
        const answer = answers.find(a => a.questionId === question._id.toString());
        return answer ? answer.optionId : null; // Assuming text answer is stored in optionId
    };

    // Mapping based on your app.py's `clean_uploaded_data`
    payload['Gender'] = getAnswer('gender');
    payload['AttendanceRate'] = getAnswer('attendance rate');
    payload['StudyHoursPerWeek'] = getAnswer('study per week');
    payload['PreviousGrade'] = getAnswer('previous grade');
    payload['ExtracurricularActivities'] = getAnswer('extracurricular activities');
    payload['ParentalSupport'] = getAnswer('parental support');
    payload['Online Classes Taken'] = getAnswer('online classes');

    return payload;
}

module.exports = {
    formsGet : async(req,res)=>{
        try{
            var result = await FormModel.find().lean();
            res.send(result);     
        }catch(e){
            res.send(e);
        }
    },

    createForm: async(req,res)=>{     
        try {
            var data = {
                createdBy : req.body.createdBy,
                name: req.body.name,
                description: req.body.description
            }

            var newForm = new FormModel(data)
            await newForm.save().then((docs)=>{
                UserModel.updateOne(
                    {_id: data.createdBy },
                    { $push: { createdForms: docs._id}})
                    .then(()=>{
                    console.log("Form id added to user deeatils");
                }).catch(error => console.log("got some error"))  
                res.status(200).json(
                    docs
                );
            })

        } catch (error) {
            res.send(error)
        }
    },

    getFormById: async(req, res)=>{
        try {
            var formId = req.params.formId;

            await FormModel.findOne({_id: formId}).then(async(form)=>{

                if(form == null){
                    res.status(404).send('Form not found');
                } else{ 
                    res.status(200).json(form)
                }
            })

        } catch (error) {
            res.send(error)
        }
    },

    deleteForm: async(req, res)=>{

        try {
            var formId = req.params.formId;
            var userId = req.params.userId;

            console.log(formId);
            console.log(userId);

            await FormModel.findOne({_id: formId}).then(async(form)=>{ 
                console.log(form);
                if(form== null){
                    res.status(404).send('Form not found or already deleted');
                } else { 
                    if(form.createdBy == userId){
                        form.remove(function(err) {
                            if(err) { return res.status(500).send(err) }
                            console.log('Form deleted');                 
                            return res.status(202).send("Form Deleted")
                        });                       
                    } 
                    else{
                        res.status(401).send("You are not the owner of this Form");
                    }
                }
            });
        } catch (error) {

        }
    },

    editForm : async(req, res)=>{
        try {
            var  formId =  req.body.formId;
            var data = {
                name: req.body.name,
                description: req.body.description,
                questions: req.body.questions
            }

            console.log("Hi, I am from backend, this is form data that i recivied");


            console.log(data);


            FormModel.findByIdAndUpdate(formId, data ,{new: true} ,(err, result)=>{
                if(err){
                    res.status(500).send(err)
                }
                else{
                    res.status(200).json(result)
                }
            });

        } catch (error) {
            res.send(error)
        }
    },

    getAllFormsOfUser: async(req, res)=>{
        try {
            var userId = req.params.userId;
            console.log(userId);
            await UserModel.findOne({_id:userId}).then(async(user)=>{
                if(user == null){
                    res.status(404).send('User not found');
                } else{ 
                await FormModel.find().where('_id').in(user.createdForms).exec((err, records) => {
                    console.log(records);

                    res.status(200).json(records);
                });
                }
            });

        } catch (error) {
            res.send(error)
        }
    },

    submitResponse : async(req, res)=>{
        try {
            var data = {
                formId: req.body.formId,
                userId: req.body.userId,
                response: req.body.response
            }
            console.log(data.formId);
            console.log(data.userId);


            if (data.response.length > 0) {
                var newResponse = new ResponseModel(data)

                await newResponse.save().then((docs)=>{              
                    res.status(200).json(
                        docs
                    );
                })
            } 
            else{
                res.status(400).send("FIll atleast one field, MF!"); 
            } 
        } catch (error) {
            res.send(error)
        }
    },

    allResponses : async(req,res)=>{
        try{
            var result = await ResponseModel.find().lean();
            res.json(result);     
        }catch(e){
            res.send(e);
        }
    },

    getResponse: async(req, res)=>{
        try {
            var formId = req.params.formId;

            await ResponseModel.find({formId: formId}).then(async(responses)=>{ 
                    res.status(200).json(responses)
            })

        } catch (error) {
            res.send(error)
        }
    },

    // NEW FUNCTION
    getPredictions: async(req, res) => {
        try {
            const formId = req.params.formId;
            const form = await FormModel.findById(formId);
            if (!form) {
                return res.status(404).send("Form not found");
            }

            const responses = await ResponseModel.find({ formId: formId });
            const predictions = [];

            for (const resp of responses) {
                // Map the form data to the payload our Python API expects
                const payload = mapDataToPayload(form.questions, resp.response);

                try {
                    // Call the Python Flask API
                    const apiRes = await axios.post('http://127.0.0.1:5001/predict', payload);
                    predictions.push({
                        responseId: resp._id,
                        userId: resp.userId,
                        prediction: apiRes.data.prediction,
                        confidence: apiRes.data.confidence,
                        rawData: payload // for debugging
                    });
                } catch (e) {
                    console.error("Error calling prediction API:", e.message);
                    predictions.push({
                        responseId: resp._id,
                        userId: resp.userId,
                        prediction: "Error",
                        confidence: "-",
                        rawData: payload
                    });
                }
            }
            res.status(200).json(predictions);
        } catch (error) {
            console.error("Error in getPredictions:", error);
            res.status(500).send(error);
        }
    }
}