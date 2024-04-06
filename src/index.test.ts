import { it, expect, vi } from "vitest";
import { start } from "./app";
import "./index";

vi.mock("./app");

it('should call start', () =>  {
  expect(start).toBeCalled();
});

