const oneMinuteExpiry = (otpTimestamp) => {
    try {
        // Assurez-vous que otpTimestamp est bien un objet Date
        const otpDate = new Date(otpTimestamp);
        if (isNaN(otpDate.getTime())) {
            console.error('Invalid timestamp:', otpTimestamp);
            return false; // Return false if otpTimestamp is not valid
        }

        const currentDatetime = new Date().getTime(); // Current time in milliseconds
        const otpDatetime = otpDate.getTime(); // Convert otpTimestamp to milliseconds
        const differenceInMilliseconds = currentDatetime - otpDatetime; // Difference in milliseconds
        const differenceInMinutes = differenceInMilliseconds / 1000 / 60; // Convert milliseconds to minutes

        console.log('Expiry minutes:', differenceInMinutes);
        return differenceInMinutes > 1; // Return true if more than 1 minute has passed
    } catch (error) {
        console.error('Error in oneMinuteExpiry:', error);
        return false; // Return false in case of an error
    }
};

const threeMinuteExpiry = (otpTimestamp) => {
    try {
        // Assurez-vous que otpTimestamp est bien un objet Date
        const otpDate = new Date(otpTimestamp);
        if (isNaN(otpDate.getTime())) {
            console.error('Invalid timestamp:', otpTimestamp);
            return false; // Return false if otpTimestamp is not valid
        }

        const currentDatetime = new Date().getTime(); // Current time in milliseconds
        const otpDatetime = otpDate.getTime(); // Convert otpTimestamp to milliseconds
        const differenceInMilliseconds = currentDatetime - otpDatetime; // Difference in milliseconds
        const differenceInMinutes = differenceInMilliseconds / 1000 / 60; // Convert milliseconds to minutes

        console.log('Expiry minutes:', differenceInMinutes);
        return differenceInMinutes > 1; // Return true if more than 1 minute has passed
    } catch (error) {
        console.error('Error in oneMinuteExpiry:', error);
        return false; // Return false in case of an error
    }
};


export { oneMinuteExpiry, threeMinuteExpiry };