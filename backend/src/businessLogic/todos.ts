import * as uuid from 'uuid'
import { TodoAccess } from "../dataLayer/todosAccess"
import { TodoItem } from "../models/TodoItem"
import { TodoUpdate } from '../models/TodoUpdate'
import { CreateTodoRequest } from "../requests/CreateTodoRequest"


const todoAccess = new TodoAccess()

export const createTodo = async (createTodoRequest: CreateTodoRequest, userId: string): Promise<TodoItem> => {
  const todoId = uuid.v4()
  const todoItem: TodoItem = {
    userId,
    todoId,
    createdAt: new Date().toDateString(),
    name: createTodoRequest.name,
    dueDate: new Date(createTodoRequest.dueDate).toDateString(),
    done: false,
    attachmentUrl: '',
  }
  return await todoAccess.createTodo(todoItem)
}

export const deleteTodo = () => {}

export const createAttachmentPresignedUrl = () => {}

export const getTodosForUser = async (userId: string) => {
  const todos = await todoAccess.getAllTodos(userId)
  return todos
}

export const updateTodo = async (todoId: string, userId: string, updateTodoRequest: TodoUpdate): Promise<boolean> => {
  return await todoAccess.updateTodo(todoId, userId, updateTodoRequest)
}