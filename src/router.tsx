import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { HomePage }      from './pages/HomePage'
import { LoginPage }     from './pages/LoginPage'
import { RegisterPage }  from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { DecksPage }     from './pages/DecksPage'
import { GameBoard }     from './components/GameBoard'
import { NewDeckPage }  from './pages/NewDeckPage'
import { EditDeckPage } from './pages/EditDeckPage'

const rootRoute = createRootRoute()

const indexRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/',          component: HomePage })
const loginRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/login',     component: LoginPage })
const registerRoute   = createRoute({ getParentRoute: () => rootRoute, path: '/register',  component: RegisterPage })
const dashboardRoute  = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: DashboardPage })
const decksRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/decks',     component: DecksPage })
const gameRoute       = createRoute({ getParentRoute: () => rootRoute, path: '/game',      component: GameBoard })
const newDeckRoute    = createRoute({ getParentRoute: () => rootRoute, path: '/decks/new',  component: NewDeckPage })
const editDeckRoute   = createRoute({ getParentRoute: () => rootRoute, path: '/decks/$id',  component: EditDeckPage })


const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  decksRoute,
  newDeckRoute,
  editDeckRoute,
  gameRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}