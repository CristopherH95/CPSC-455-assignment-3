/**
 * Tracker class for keeping track of login attempts
 */
class Tracker {
    /**
     * constructor associates username with attempts and lockout time
     * @param {string} user the username that's being tracked
     */
    constructor(user) {
        Object.defineProperties(this, {
            user: {
                value: user,
            },
            attempts: {
                value: 0,
                writable: true,
            },
            lockoutTime: {
                value: null,
                writable: true,
            },
        });
    }

    /**
     * Adds an attempt to the counter
     * If attempts exceeded the lockout time is set
     */
    addAttempt() {
        this.attempts = (this.attempts < 3) ? this.attempts + 1 : 0;
        if (this.attempts === 0) {
            this.lockoutTime = new Date();    // set lockout time
        }
    }

    /**
     * Determines whether the associated user is locked out or not
     * @return {boolean}
     */
    isLocked() {
        if (this.lockoutTime) {
            let now = new Date();
            let timeDiff = Math.floor(Math.abs(this.lockoutTime - now) / 1000);
            if (timeDiff > 600) {
                this.lockoutTime = null;    // reset lockout after 10 minutes
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }
}

module.exports = Tracker;