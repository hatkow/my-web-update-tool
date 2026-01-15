export interface Profile {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
}

export interface Project {
  id: string
  name: string
  ftp_host: string
  ftp_user: string
  ftp_password_encrypted: string
  ftp_port: number
  ftp_path: string
  target_files: string[]
  created_at: string
}

export interface UserProject {
  id: string
  user_id: string
  project_id: string
  assigned_at: string
  project?: Project
  profile?: Profile
}
