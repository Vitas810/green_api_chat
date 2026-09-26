import './Input.scss'

function Input({ className = '', ...props }) {
  return <input className={`input${className ? ` ${className}` : ''}`} {...props} />
}

export default Input
