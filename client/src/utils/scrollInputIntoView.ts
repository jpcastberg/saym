function scrollInputIntoView(event: FocusEvent) {
    const inputElement = event.target as HTMLInputElement;
    setTimeout(() => {
        inputElement.scrollIntoView({
            behavior: "smooth",
        });
    }, 650); // seems to be long enough to wait for the ios mobile keyboard to finish popping
}

export default scrollInputIntoView;
