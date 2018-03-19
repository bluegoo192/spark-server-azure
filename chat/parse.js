const parse = {
  affirmation: (text, yes, no, unhandled) => {
    if (!text) return unhandled();
    switch (text.toLowerCase()) {
      case "yeah":
      case "yep":
      case "yea":
      case "y":
      case "yes":
        return yes();
      case "nah":
      case "nope":
      case "no":
        return no();
      default:
        return unhandled();
    }
  },
  address: (text, handle) => {
    if (!text) return handle.unhandled();
    return handle.invalid();
  },
  secondsToMinutes: (seconds) => {
    let minutes = seconds / 60;
    return Math.ceil(minutes);
  }
}

module.exports = parse;
