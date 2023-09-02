function validateUsername(usernameInputValue: string) {
    if (usernameInputValue.length > 25) {
        return "Username can be a maximum of 25 characters";
    }

    return true;
}

export default validateUsername;
