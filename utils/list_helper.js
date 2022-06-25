// eslint-disable-next-line no-unused-vars
const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce(
    (sum, blog) => sum + blog.likes, 0
  )
}

const favouriteBlog = (blogs) => {
  return blogs.reduce((max, blog) => max.likes > blog.likes ? max : blog, 0)
}

const mostBlogs = (blogs) => {
  const authorList = blogs.map(blog => blog.author)
  const highestAuthor = authorList.concat().sort(
    (a,b) => authorList.filter(v => v===a).length
    - authorList.filter(v => v===b).length)
    .pop()
  const occurences = authorList.filter(author => author === highestAuthor).length

  const result = {
    author: highestAuthor,
    blogs: occurences
  }

  return result
}

const mostLikes = (blogs) => {
  return 1
}
module.exports = {
  dummy,
  totalLikes,
  favouriteBlog,
  mostBlogs,
  mostLikes
}