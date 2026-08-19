from datetime import date
from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class SchedulerAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="TestPassword123!",
        )

        response = self.client.post(
            "/api/token/",
            {
                "username": "testuser",
                "password": "TestPassword123!",
            },
            format="json",
        )

        self.token = response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

    def test_health_check(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")

    def test_register_user(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "newuser",
                "email": "new@example.com",
                "password": "NewPassword123!",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(response.data["username"], "newuser")
        self.assertTrue(
            User.objects.filter(username="newuser").exists()
        )

    def test_create_schedule(self):
        response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(response.data["date"], "2026-08-20")
        self.assertEqual(response.data["user"], self.user.id)

    def test_create_schedule_without_authentication(self):
        self.client.credentials()

        response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_today_schedule_returns_404_when_missing(self):
        response = self.client.get(
            "/api/schedules/today/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            response.data["detail"],
            "No schedule for today yet.",
        )

    def test_today_schedule_returns_users_schedule(self):
        self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-19",
            },
            format="json",
        )

        response = self.client.get(
            "/api/schedules/today/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(response.data["date"], "2026-08-19")

    def test_create_task(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        schedule_id = schedule_response.data["id"]

        response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_id,
                "name": "Study Django",
                "description": "REST API work",
                "duration_minutes": 90,
                "priority": 1,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            response.data["name"],
            "Study Django",
        )
        self.assertEqual(
            response.data["duration_minutes"],
            90,
        )

    def test_task_cannot_exceed_24_hour_schedule_limit(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        schedule_id = schedule_response.data["id"]

        first_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_id,
                "name": "Large task",
                "duration_minutes": 1400,
                "priority": 1,
            },
            format="json",
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        second_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_id,
                "name": "Overflow task",
                "duration_minutes": 41,
                "priority": 2,
            },
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "over the 24-hour limit",
            str(second_response.data),
        )

    def test_start_task(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        task_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_response.data["id"],
                "name": "Task",
                "duration_minutes": 60,
            },
            format="json",
        )

        task_id = task_response.data["id"]

        response = self.client.post(
            f"/api/tasks/{task_id}/start/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(response.data["status"], "active")
        self.assertIsNotNone(response.data["started_at"])

    def test_complete_task_records_actual_minutes(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        task_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_response.data["id"],
                "name": "Task",
                "duration_minutes": 60,
            },
            format="json",
        )

        task_id = task_response.data["id"]

        self.client.post(
            f"/api/tasks/{task_id}/start/"
        )

        response = self.client.post(
            f"/api/tasks/{task_id}/complete/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(response.data["status"], "done")
        self.assertIsNotNone(
            response.data["completed_at"]
        )
        self.assertIsNotNone(
            response.data["actual_minutes_spent"]
        )

    def test_extend_task(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        task_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_response.data["id"],
                "name": "Task",
                "duration_minutes": 60,
            },
            format="json",
        )

        task_id = task_response.data["id"]

        response = self.client.post(
            f"/api/tasks/{task_id}/extend/",
            {
                "minutes": 15,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["duration_minutes"],
            75,
        )

    def test_extend_rejects_invalid_minutes(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        task_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_response.data["id"],
                "name": "Task",
                "duration_minutes": 60,
            },
            format="json",
        )

        task_id = task_response.data["id"]

        response = self.client.post(
            f"/api/tasks/{task_id}/extend/",
            {
                "minutes": -10,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_bulk_add_tasks(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        schedule_id = schedule_response.data["id"]

        response = self.client.post(
            f"/api/schedules/{schedule_id}/bulk_add_tasks/",
            {
                "tasks": [
                    {
                        "name": "Task A",
                        "duration_minutes": 90,
                        "priority": 1,
                    },
                    {
                        "name": "Task B",
                        "duration_minutes": 60,
                        "priority": 2,
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(len(response.data), 2)
        self.assertEqual(
            response.data[0]["order"],
            0,
        )
        self.assertEqual(
            response.data[1]["order"],
            1,
        )

    def test_bulk_add_rejects_overflow(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        schedule_id = schedule_response.data["id"]

        response = self.client.post(
            f"/api/schedules/{schedule_id}/bulk_add_tasks/",
            {
                "tasks": [
                    {
                        "name": "Huge task",
                        "duration_minutes": 1441,
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_409_CONFLICT,
        )
        self.assertEqual(
            response.data["error"],
            "overflow",
        )
        self.assertEqual(
            response.data["limit_minutes"],
            1440,
        )
        self.assertEqual(
            response.data["overflow_minutes"],
            1,
        )

    def test_reorder_tasks(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        schedule_id = schedule_response.data["id"]

        first = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_id,
                "name": "First",
                "duration_minutes": 30,
            },
            format="json",
        )

        second = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_id,
                "name": "Second",
                "duration_minutes": 30,
            },
            format="json",
        )

        response = self.client.post(
            "/api/tasks/reorder/",
            {
                "order": [
                    second.data["id"],
                    first.data["id"],
                ]
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["detail"],
            "reordered",
        )

    def test_user_cannot_access_another_users_task(self):
        schedule_response = self.client.post(
            "/api/schedules/",
            {
                "date": "2026-08-20",
            },
            format="json",
        )

        task_response = self.client.post(
            "/api/tasks/",
            {
                "schedule": schedule_response.data["id"],
                "name": "Private task",
                "duration_minutes": 30,
            },
            format="json",
        )

        task_id = task_response.data["id"]

        self.client.force_authenticate(
            user=self.other_user
        )

        response = self.client.get(
            f"/api/tasks/{task_id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )