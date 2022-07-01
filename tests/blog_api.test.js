const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const User = require('../models/user')
const supertest = require('supertest')
const app = require('../app')

const api = supertest(app)

const Blog = require('../models/blog')
const helper = require('./test_helper')

beforeEach(async () => {
  await Blog.deleteMany({})
  await Blog.insertMany(helper.initialBlogs)
})

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'Salainen2!',
    }


    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('username must be unique')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toEqual(usersAtStart)
  })
})

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all blogs are returned', async () => {
  const response = await api.get('/api/blogs')

  expect(response.body).toHaveLength(helper.initialBlogs.length)
})

test('unique identifier is called id', async () => {
  const response = await api.get('/api/blogs')

  expect(response.body[0].id).toBeDefined()

})



describe('adding a new blog', () => {
  let token = null
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
    const userLogin = {
      username: 'root',
      password: 'sekret',
    }
    const response = await api
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send(userLogin)
    token = response.body.token
  })

  test('a valid blog can be added ', async () => {

    const newBlog = {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      url: 'https://en.wikipedia.org/wiki/The_Great_Gatsby'
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)
    const titles = blogsAtEnd.map(b => b.title)
    expect(titles).toContain('The Great Gatsby')
  })

  test('status code sent when title or url are missing', async () => {
    const newBlog = {
      author: 'F. Scott Fitzgerald',
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(400)
      .expect('Content-Type', /application\/json/)
  })

  test('likes property set to 0 if missing', async () => {
    const newBlog = {
      title: 'Not Liked',
      author: 'James',
      url: 'https://',
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    const blog = blogsAtEnd.find((blog) => blog.title === 'Not Liked')
    expect(blog.likes).toBe(0)
  })

  test('fails if token missing', async () => {
    const newBlog = {
      title: 'Token Missing',
      author: 'James',
      likes: 3,
      url: 'http://github.com',
    }

    await api
      .post('/api/blogs')
      .set('Authorization', 'bearer 4asd')
      .send(newBlog)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
})

describe('deleting a bog post', () => {
  let token = null
  let blogToDeleteId = null

  beforeEach(async () => {
    await User.deleteMany({})
    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()

    const userLogin = {
      username: 'root',
      password: 'sekret',
    }
    const response = await api
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send(userLogin)
    token = response.body.token

    const newBlog = {
      title: 'Blog to Delete',
      author: 'Scott',
      url: 'http://github.com',
    }

    const newBlogResponse = await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
    blogToDeleteId = newBlogResponse.body.id
  })

  test('a blog can be deleted', async () => {
    const blogsAtStart = await helper.blogsInDb()

    await api
      .delete(`/api/blogs/${blogToDeleteId}`)
      .set('Authorization', `bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    console.log('$$$$$$$$$$$$')

    expect(blogsAtEnd.length).toBe(
      blogsAtStart.length - 1
    )

    const titles = blogsAtEnd.map((b) => b.title)

    expect(titles).not.toContain('Blog to Delete')

  })
})

describe('updating blog posts', () => {

  let token = null
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
    const userLogin = {
      username: 'root',
      password: 'sekret',
    }
    const response = await api
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send(userLogin)
    token = response.body.token
  })

  test('a blog can be updated', async () => {

    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart.find((b) => b.title === 'Type wars')

    const newBlog = {
      title: blogToUpdate.title,
      author: blogToUpdate.author,
      url: blogToUpdate.url,
      likes: 10
    }

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    const updatedBlog = blogsAtEnd.find((b) => b.id === blogToUpdate.id)
    expect(updatedBlog.likes).toBe(10)
  })


})





afterAll(() => {
  mongoose.connection.close()
})
