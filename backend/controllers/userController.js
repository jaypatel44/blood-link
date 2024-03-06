const OtpModel = require('../models/otp')
const {otpVerification} = require('../helpers/otpValidate')

const otpGenerator = require('otp-generator');
const twilio = require('twilio');

const accountsid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const twilioClient = new twilio(accountsid, authToken);

const sendOtp = async (req, res) => {
    try {

        const { phoneNumber } = req.body;

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });

        const cDate = new Date();

        await OtpModel.findOneAndUpdate(
            { phoneNumber },
            { otp, otpExpiration: new Date(cDate.getTime()) },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await twilioClient.messages.create({
            body: `${otp} is your OTP to access BloodLink. OTP is confidential and valid for 10 minutes. For security reasons, DO NOT share this OTP with anyone.`,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        return res.status(200).json({
            success: true,
            msg: 'OTP Sent Successfully!!'
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        const otpData = await OtpModel.findOne({
            phoneNumber,
            otp
        });

        if (!otpData) {
            return res.status(400).json({
                success: false,
                msg: 'You eneterd wrong OTP!'
            });
        }

        const isOtpExpired=await otpVerification(otpData.otpExpiration);

        if(isOtpExpired){
            return res.status(400).json({
                success: false,
                msg: 'You OTP has been expired!'
            });
        }

        return res.status(200).json({
            success: true,
            msg: 'OTP varified Successfully!'
        });
        
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        });
    }
}


module.exports = {
    sendOtp, verifyOtp
}