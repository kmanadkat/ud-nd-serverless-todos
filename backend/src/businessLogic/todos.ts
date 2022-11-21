import { TodoAccess } from "../dataLayer/todosAccess"


const todoAccess = new TodoAccess()

export const createTodo = () => {}

export const deleteTodo = () => {}

export const createAttachmentPresignedUrl = () => {}

export const getTodosForUser = async (userId: string) => {
  const todos = await todoAccess.getAllTodos(userId)
  return todos
}

export const updateTodo = () => {}