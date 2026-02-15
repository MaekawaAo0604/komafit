/**
 * App Component
 *
 * Root application component with routing and global providers.
 */

import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { router } from './router'
import { store } from './store'
import './styles/global.css'

function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}

export default App
