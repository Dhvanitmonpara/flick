import ReactDOM from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import NotFoundPage from './pages/NotFoundPage'
import LandingPage from './pages/LandingPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import AuthLayout from './layouts/AuthLayout'
import RootLayout from './layouts/RootLayout'
import React from 'react'
import AppLayout from './layouts/AppLayout'
import FeedPage from './pages/FeedPage'
import EmailVerificationPage from './pages/EmailVerificationPage'

// router
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // public routes
      {
        path: "home",
        element: <LandingPage />,
      },
      {
        path: "",
        element: <AppLayout />,
        children: [
          {
            path: "",
            element: <FeedPage/>,
          },
          {
            path: "college",
            element: <h1>My College</h1>,
          },
          {
            path: "polls",
            element: <h1>Polls</h1>,
          },
          {
            path: "trending",
            element: <h1>Trending</h1>,
          },
        ]
      },
      // auth routes
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          {
            path: "signin",
            element: <SignInPage />,
          },
          {
            path: "otp/:email",
            element: <EmailVerificationPage />,
          },
          {
            path: "signup",
            element: <SignUpPage />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      }
    ]
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>,
)