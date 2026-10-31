module.exports = class UserDto {

    constructor(model) {
        this.id = model.id
        this.name = model.name
        this.email = model.email
        this.role = model.role
    }
}
