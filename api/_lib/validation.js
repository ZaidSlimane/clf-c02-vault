const USERNAME = /^[a-zA-Z0-9_]{3,30}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

// bcrypt ignores everything past 72 bytes.
const MAX_PASSWORD_BYTES = 72
const MIN_PASSWORD_LENGTH = 12

const isName = (value) => value.length >= 1 && value.length <= 50 && !CONTROL_CHARS.test(value)

export function passwordProblem(password, username) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) return `Password must be at most ${MAX_PASSWORD_BYTES} bytes`
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
    return 'Password needs upper and lower case letters, a number and a symbol'
  }
  if (password.toLowerCase().includes(username.toLowerCase())) return 'Password must not contain your username'
  return null
}

// Returns { error } or { values } with trimmed names and a lower-case email.
export function parseRegistration(body) {
  const { firstName, lastName, username, email, password } = body || {}
  const fields = [firstName, lastName, username, email, password]
  if (fields.some((field) => typeof field !== 'string' || !field)) return { error: 'All fields are required' }

  const values = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  }
  if (!isName(values.firstName) || !isName(values.lastName)) return { error: 'Names must be 1 to 50 characters' }
  if (!USERNAME.test(values.username)) return { error: 'Username must be 3 to 30 letters, numbers or underscores' }
  if (values.email.length > 254 || !EMAIL.test(values.email)) return { error: 'Enter a valid email address' }

  const problem = passwordProblem(password, values.username)
  return problem ? { error: problem } : { values }
}
