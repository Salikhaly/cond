module.exports = class UserProfileDto {

    constructor(model) {
        this.name = model.name
        this.email = model.email
        this.role = model.role
        this.createdAt = model.createdAt
    }
}