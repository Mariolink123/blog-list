const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const jwt = require('jsonwebtoken')

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog
    .find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

blogsRouter.post('/:id/comments', async (request, response, next) => {
  console.log(request.params, request.body)
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const blogToComment = await Blog.findById(request.params.id)
  if (!blogToComment ) {
    return response.status(404).json({ error: 'blog not found' })
  }

  if (!request.body.comment) {
    return response.status(400).json({ error: 'comment not included' })
  }

  blogToComment.comments = blogToComment.comments.concat(request.body.comment)
  try {
    await blogToComment.save()
  } catch (exception) {
    next(exception)
  }
})


blogsRouter.post('/', async (request, response, next) => {
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const user = request.user
  const blog = new Blog({ ...request.body, user: user.id })

  try {
    const savedBlog = await blog.save()
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()
    const newBlog = await Blog.findById(savedBlog._id).populate('user', { name:1, username: 1 })
    response.status(201).json(newBlog)
  } catch (exception) {
    next(exception)
  }
})

blogsRouter.delete('/:id', async (request, response, next) => {

  const blogToDelete = await Blog.findById(request.params.id)
  if (!blogToDelete ) {
    return response.status(204).end()
  }

  if ( blogToDelete.user && blogToDelete.user.toString() !== request.user.id ) {
    return response.status(401).json({
      error: 'only the creator can delete a blog'
    })
  }

  try {
    await Blog.findByIdAndRemove(request.params.id)
  } catch(exception) {
    next(exception)
  }

  response.status(204).end()
})

blogsRouter.put('/:id', async (request, response, next) => {
  // eslint-disable-next-line prefer-destructuring
  const body = request.body

  let decodedToken = null
  try {
    decodedToken = jwt.verify(request.token, process.env.SECRET)
  } catch (exception) {
    next(exception)
  }
  if (!decodedToken || !decodedToken.id) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  const blog = {
    title: body.title,
    author: body.important,
    url: body.url,
    likes: body.likes,
  }

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
  }).populate('user', { username: 1, name: 1 })
  response.json(updatedBlog)
})

module.exports = blogsRouter