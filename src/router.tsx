import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { HomePage }      from './pages/HomePage'
import { LoginPage }     from './pages/LoginPage'
import { RegisterPage }  from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { DecksPage }     from './pages/DecksPage'
import { ShopPage }      from './pages/ShopPage'
import { PlayModePage }   from './pages/PlayModePage'
import { SoloGamePage }   from './pages/SoloGamePage'
import { OnlineGamePage } from './pages/OnlineGamePage'
import { NewDeckPage }  from './pages/NewDeckPage'
import { EditDeckPage } from './pages/EditDeckPage'

const rootRoute = createRootRoute()

const indexRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/',          component: HomePage })
const loginRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/login',     component: LoginPage })
const registerRoute   = createRoute({ getParentRoute: () => rootRoute, path: '/register',  component: RegisterPage })
const dashboardRoute  = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: DashboardPage })
const decksRoute      = createRoute({ getParentRoute: () => rootRoute, path: '/decks',     component: DecksPage })
const shopRoute       = createRoute({ getParentRoute: () => rootRoute, path: '/shop',      component: ShopPage })
const gameRoute       = createRoute({ getParentRoute: () => rootRoute, path: '/game',        component: SoloGamePage })
const playRoute       = createRoute({ getParentRoute: () => rootRoute, path: '/play',        component: PlayModePage })
const onlineGameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/play/online',  component: OnlineGamePage })
const newDeckRoute    = createRoute({ getParentRoute: () => rootRoute, path: '/decks/new',  component: NewDeckPage })
const editDeckRoute   = createRoute({ getParentRoute: () => rootRoute, path: '/decks/$id',  component: EditDeckPage })


const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  decksRoute,
  shopRoute,
  newDeckRoute,
  editDeckRoute,
  playRoute,
  gameRoute,
  onlineGameRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}