import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Practice from "../pages/practice/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/practice",
    element: <Practice />,
  },
  {
    path: "/practice/:bookId",
    element: <Practice />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;