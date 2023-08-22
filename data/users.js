import bcrypt from 'bcryptjs';
const salt = await bcrypt.genSalt(10);
const users = [
    {
        name: 'Admin',
        email: 'ts-fashionshop2023@gmail.com',
        password: await bcrypt.hash('123456', salt),
        role: 'admin',
    },
    // {
    //     name: 'User',
    //     email: 'user@example.com',
    //     password: bcrypt.hashSync('123456', 10),
    // },
];

export default users;
