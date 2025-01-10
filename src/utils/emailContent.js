
const otpContent = (otp) => {
  return `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #333;">Hello,</h2>
                <p>Thank you for using ${process.env.APP_NAME}. Your OTP code is:</p>
                <h1 style="color: #007bff;">${otp}</h1>
                <p>This OTP code is valid for 5 minutes. Please do not share this code with anyone.</p>
                <p>If you did not request this OTP, please ignore this email.</p>
                <br>
                <p>Best regards,</p>
                <p>Team unfazed</p>
            </div>
        `;
};



export { otpContent };
